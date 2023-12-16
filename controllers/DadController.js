const aws = require('aws-sdk');

const nodeSchedule = require('node-schedule');

const models = require('../models');
const validator = require('../validators/signup');
const signupController = require('./SignUpController');
const dashboardController = require('./DashboardController');
const queueController = require('./QueueController');
const schoolUtility = require('../utility/school/schoolUtility');
const generalUtility = require('../utility/general/generalUtility');

aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

exports.charityAmountBackTask = async function (req, res) {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 14;
  rule.minute = 56;
  // rule.second =18;
  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('charity');
    console.log('charity amount back recurring task starting');
  });
};

exports.sendFailedEmails = async function (req, res) {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 22;
  rule.minute = 14;
  rule.second = 22;
  return nodeSchedule.scheduleJob(rule, async () => {
    // await workerQueue.add({process:'parent3DaysToDeadline'});
    // console.log('Parent 3 Days To Deadline recurring task starting');

    const purchasebaskets = await models.sequelize.query('SELECT distinct pb.* FROM emails e '
    + ' inner join accounts a on e.accountFk = a.id  '
    + ' inner join basketitems b on b.accountfk = a.id '
    + ' inner join purchasebaskets pb on b.purchasebasketFk = pb.id '
    + ' where e.status = :failed and e.emailTypeFk = 18 '
    + ' and pb.status = :completed ', {
      replacements: {
        failed: 'Failed',
        completed: 'Completed',
      },
      type: models.sequelize.QueryTypes.SELECT,
    });

    purchasebaskets.forEach(async (purchaseBasket) => {
      models.sequelize.query('select b.*, k.name, k.age,k.code, a.email, if(s.name = "Individuals","", s.name) as school,s.postCode, p.name as packageName, if(k.displayAge=true,:yes,:no) as displayAge,if(k.displayClass=true,:yes,:no) as displayClass,if(k.displaySchool=true,:yes,:no) as displaySchool, FORMAT(b.cost,2) as cost from basketitems b '
      + ' inner join kids k on b.kidFk = k.id '
      + ' inner join classes c on k.classFk = c.id '
      + ' inner join schools s on c.schoolFk = s.id '
      + ' inner join accounts a on b.accountFk = a.id '
      + ' inner join packages p on b.packageFk = p.id '
      + ' where purchaseBasketFk = :purchaseBasketId ', { replacements: { purchaseBasketId: purchaseBasket.id, yes: 'Yes', no: 'No' }, type: models.sequelize.QueryTypes.SELECT })
        .then(async (basketItems) => {
          const basketItems2 = await models.sequelize.query('select b.*,a.email,  p.name as packageName, FORMAT(b.cost,2) as cost from basketItems b '
                  + ' inner join packages p on b.packageFk = p.id '
                  + ' inner join accounts a on b.accountFk = a.id '
                  + ' where b.purchaseBasketFk = :purchaseBasketId '
                  + ' and b.kidFk is null ', { replacements: { purchaseBasketId: purchaseBasket.id }, type: models.sequelize.QueryTypes.SELECT });

          basketItems2.forEach((item) => {
            basketItems.push(item);
          });

          // var basketItems = await models.sequelize.query('select b.*, a.email from basketItems b ' +
          //           ' inner join accounts a on b.accountFk = a.id ' +
          //           ' where purchaseBasketFk = :pId',
          //     {replacements:{pId:purchaseBasket.id},type:models.sequelize.QueryTypes.SELECT});

          const { purchaseDttm } = purchaseBasket;
          // var month = purchaseDttm.getMonth() + 1;
          // month = month <10 ? '0' + month : month;
          // var days = purchaseDttm.getDate();
          // days = days <10 ? '0' + days : days;
          // var years = purchaseDttm.getFullYear();

          let hours = purchaseDttm.getHours();
          hours = hours < 10 ? `0${hours}` : hours;
          let minutes = purchaseDttm.getMinutes();
          minutes = minutes < 10 ? `0${minutes}` : minutes;
          let seconds = purchaseDttm.getSeconds();
          seconds = seconds < 10 ? `0${seconds}` : seconds;

          const time = `${hours}:${minutes}:${seconds}`;

          await queueController.addPurchaseEmailJob('purchaseEmail', basketItems, `blu-${purchaseBasket.id}`, purchaseBasket.purchaseDttm, purchaseBasket.total, time);
          await queueController.addPurchaseEmailJob('purchaseEmailToBluwave', basketItems, `blu-${purchaseBasket.id}`, purchaseBasket.purchaseDttm, purchaseBasket.total, time);

          await models.email.destroy({
            where: {
              accountFk: basketItems[0].accountFk,
              emailTypeFk: 18,
            },
          });
        });
    });
  });
};

exports.createSchool = function (req, res) {
  // console.log(req.body);
  models.school.findOne({
    where: {
      name: req.body.school,
      email: req.body.email,
    },
  }).then((school) => {
    if (school === null) {
      // create school
      models.school.build({
        name: req.body.school,
        address: req.body.address,
        postCode: req.body.postCode,
        email: req.body.email,
        number: req.body.number,
      }).save().then((school) => {
        models.status.build({
          statusTypeFk: 1,
          createdDttm: Date.now(),
          schoolFk: school.id,
        }).save();
      });
    } else {
      // throw and error message
    }
  });

  return res.redirect('/addSchool');
};

exports.getSchools = function (req, res) {
  return getLocalSchools(req, res);
};

const getLocalSchools = function (req, res) {
  let page = 'addClass';

  return models.school.findAll({
    order: [
      ['name', 'ASC'],
    ],
  }).then(async (results) => {
    const array = new Array();

    results.forEach((result) => {
      array.push(result.dataValues);
    });

    let years = await getYears();
    years = await Promise.all(years);

    if (req.path === '/addKid' || req.path === '/createKid') page = 'addKid';
    else if (req.path === '/createCards') page = 'createCards';

    res.render(page, { user: req.user, schools: array, years });
  });
};

const getYears = async function () {
  const date = new Date();
  const currentYear = date.getFullYear();
  // console.log(currentYear);
  return models.year.findOne({
    where: {
      year: currentYear,
    },
  }).then(async (year) => {
    if (year === null) {
      const newYear = models.year.build({
        year: currentYear,
      });

      return newYear.save().then(() => getAllYears());
    }

    return getAllYears();
  });
};

const getAllYears = function () {
  return models.year.findAll().then((years) => {
    const array = new Array();

    years.forEach((year) => {
      array.push(year.dataValues);
    });

    return array;
  });
};

exports.createClass = function (req, res) {
  const { schoolId } = req.body;
  const { yearId } = req.body;
  const { className } = req.body;

  models.class.findOne({
    where: {
      name: className,
      schoolFk: schoolId,
      yearFk: yearId,
    },
  }).then((schoolClass) => {
    if (schoolClass == null) {
      models.class.build({
        name: className,
        schoolFk: schoolId,
        yearFk: yearId,
      }).save().then(() => {
        models.sequelize.query('select c.*, y.year from classes c '
              + ' inner join schools s on c.schoolFk = s.id '
              + ' inner join years y on c.yearFk = y.id '
              + ' where s.id = :schoolId '
              + ' order by c.name asc', { replacements: { schoolId }, type: models.sequelize.QueryTypes.SELECT })
          .then((schoolClasses) => {
            res.json({ schoolClasses });
          });
      });
    } else {
      const errors = `A class already exist with name ${schoolClass.name} for this school in this year`;
      res.json({ errors });
    }
  });
};

exports.getClasses = function (req, res) {
  // console.log(req.query);
  return models.class.findAll({
    where: {
      schoolFk: req.query.schoolId,
      yearFk: req.query.yearId,
    },
    order: [
      ['name', 'ASC'],
    ],
  }).then((classes) => {
    const array = new Array();

    classes.forEach((kidClass) => {
      array.push(kidClass.dataValues);
    });

    return res.json(array);
  });
};

exports.getClassesWithCards = function (req, res) {
  return models.class.findAll({
    where: {
      schoolFk: req.query.schoolId,
      yearFk: req.query.yearId,
    },
    order: [
      ['name', 'ASC'],
    ],
  }).then((classes) => {
    const array = new Array();

    classes.forEach((kidClass) => {
      array.push(kidClass.dataValues);
    });

    models.kid.findAll({
      where: {
        classFk: classes,
      },
    }).then((kids) => {
      const kidArray = new Array();
      kids.forEach((kid) => {
        kidArray.push(kid);
      });

      models.card.findAll({
        where:
        {
          kidFk: kidArray,
        },
      });
    });

    return res.json(array);
  });
};

exports.searchClassResults = async function (req, res) {
  const { school } = req.body;
  const schoolClass = req.body.class;
  const { year } = req.body;

  const result = await models.sequelize.query('select c.id, c.name, y.year, s.name as school from classes c '
  + ' inner join schools s on c.schoolFk = s.id '
  + ' inner join years y on c.yearFk = y.id '
  + ' where y.year like :year '
  + ' and s.name like :school '
  + ' and c.name like :class ', {
    replacements: {
      year: `%${year}%`,
      school: `%${school}%`,
      class: `%${schoolClass}%`,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });

  res.json({ result });
};

exports.searchKidsResults = async function (req, res) {
  const { school } = req.body;
  const schoolClass = req.body.class;
  const { year } = req.body;

  const { name } = req.body;
  const { age } = req.body;
  const code = req.body.cardCode;

  const result = await models.sequelize.query('select k.*, s.name as schoolName, y.year, c.name as className, k.id as kidId from classes c '
                                  + ' inner join schools s on c.schoolFk = s.id '
                                  + ' inner join years y on c.yearFk = y.id '
                                  + ' inner join kids k on k.classFk = c.id '
                                  + ' where k.code like :code '
                                  + ' and k.age like :age '
                                  + ' and k.name like :name '
                                  + ' and y.year like :year '
                                  + ' and s.name like :school '
                                  + ' and c.name like :class '
                                  + ' and k.deleteFl = false ', {
    replacements: {
      code: `%${code}%`,
      age: `%${age}%`,
      name: `%${name}%`,
      year: `%${year}%`,
      school: `%${school}%`,
      class: `%${schoolClass}%`,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });

  res.json({ result });
};

exports.addCalendarPicture = async function (req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType == 'image/png') ? 'png' : 'jpg';
  const s3CalendarPicturePath = `${process.env.s3BucketPath}Calendar/Pictures/${date}_${fileName}.${suffix}`;

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: req.files.file.data,
    Key: `Calendar/Pictures/${date}_${fileName}.${suffix}`,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await s3UploadPromise;

  const { kidId } = req.body;
  models.calendar.update({
    calendarPicture: s3CalendarPicturePath,
  }, {
    where: {
      kidFk: kidId,
    },
  }).then(() => {
    res.json({ success: 'success' });
  });
};

exports.addPicture = async function (req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType == 'image/png') ? 'png' : 'jpg';
  const s3PicturePath = `${process.env.s3BucketPath}Pictures/${date}_${fileName}.${suffix}`;

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: req.files.file.data,
    Key: `Pictures/${date}_${fileName}.${suffix}`,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await s3UploadPromise;

  const { kidId } = req.body;

  if (kidId == undefined || kidId == null) {
    const { productItemId } = req.body;
    models.productItem.update({
      picture: s3PicturePath,
    }, {
      where: {
        id: productItemId,
      },
    }).then(() => {
      res.json({ success: 'success' });
    });
  } else {
    models.kid.update({
      picture: s3PicturePath,
    }, {
      where: {
        id: kidId,
      },
    }).then(() => {
      res.json({ success: 'success' });
    });
  }
};

exports.addArtwork = async function (req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType == 'image/png') ? 'png' : 'jpg';
  const s3PicturePath = `${process.env.s3BucketPath}Artwork/${date}_${fileName}.${suffix}`;

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: req.files.file.data,
    Key: `Artwork/${date}_${fileName}.${suffix}`,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await s3UploadPromise;

  const { kidId } = req.body;

  models.kid.update({
    artwork: s3PicturePath,
  }, {
    where: {
      id: kidId,
    },
  }).then(() => {
    res.json({ success: 'success' });
  });
  // console.log(req.files);
};

exports.uploadCalendarPicture = async function (req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType == 'image/png') ? 'png' : 'jpg';
  const s3CalendarPicturePath = `${process.env.s3BucketPath}Calendar/Pictures/${date}_${fileName}.${suffix}`;

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: req.files.file.data,
    Key: `Calendar/Pictures/${date}_${fileName}.${suffix}`,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await s3UploadPromise;
  res.json({ filePath: s3CalendarPicturePath });
};

exports.uploadPicture = async function (req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType == 'image/png') ? 'png' : 'jpg';
  const s3PicturePath = `${process.env.s3BucketPath}Pictures/${date}_${fileName}.${suffix}`;

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: req.files.file.data,
    Key: `Pictures/${date}_${fileName}.${suffix}`,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await s3UploadPromise;
  // console.log(req.files);
  res.json({ filePath: s3PicturePath });
};

async function uploadPicture() {

}

exports.uploadArtwork = async function (req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType == 'image/png') ? 'png' : 'jpg';
  const s3PicturePath = `${process.env.s3BucketPath}Artwork/${date}_${fileName}.${suffix}`;

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: req.files.file.data,
    Key: `Artwork/${date}_${fileName}.${suffix}`,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await s3UploadPromise;
  // console.log(req.files);
  res.json({ filePath: s3PicturePath });
};

exports.generatePrintForm = function (req, res) {
  const { classId } = req.body;

  models.sequelize.query(
    'select b.quantity, FORMAT(b.cost,2) as cost, if(b.displayAge=true,:yes,:no) as displayAge, '
    + ' if(b.displaySchool=true,:yes,:no) as displaySchool,if(b.displayClass=true,:yes,:no) as displayClass,k.name as kidName, '
    + ' k.code, b.picture from purchaseBaskets pb '
    + ' inner join basketitems b on b.purchaseBasketFk = pb.id '
    + ' inner join productItems pi on b.productItemFk = pi.id '
    + ' inner join kids k on pi.kidFk = k.id '
    + ' inner join classes c on k.classFk = c.id '
    + ' where pb.status = :status '
    + ' and k.deleteFl = false '
    + ' and c.id = :classId order by k.name asc',
    {
      replacements: {
        classId, status: 'Completed', yes: 'Yes', no: 'No', calendar: 'Calendar',
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  )
    .then(async (purchasedCardDetails) => {
      const numberOfPurchasedItems = purchasedCardDetails.length;

      const purchasedExtras = await models.sequelize.query('select pb.id ,b.picture,FORMAT(b.cost,2) as cost, k.name,b.quantity,b.picture from basketItems b '
              + ' inner join purchaseBaskets pb on b.purchaseBasketfk = pb.id '
              + ' inner join productItems pi on b.productItemFk = pi.id '
              + ' inner join kids k on k.parentAccountFk = b.accountFk '
              + ' where (b.kidfk is null or b.kidFk in (select k.id from kids k inner join classes c on k.classFk = c.id where c.name = :className and k.parentAccountFk  = b.accountFk))'
              + ' and pb.status = :completed '
              + ' and b.accountFk in '
              + ' (select distinct a.id from classes c '
              + ' inner join kids k on k.classfk  = c.id '
              + ' inner join accounts a on k.parentAccountfk = a.id '
              + ' inner join schools s on c.schoolFk = s.id '
              + ' where c.id = :classId ) '
              + ' and k.classFk = :classId ', { replacements: { classId, className: 'Individual Class', completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT });
      if (numberOfPurchasedItems == 0 && purchasedExtras.length == 0) {
        return res.json({ errors: 'No items have been purchased for this class' });
      }

      const job = await queueController.addFormJob(classId, purchasedCardDetails, numberOfPurchasedItems, purchasedExtras);
      res.json({ id: job.id });
    });
};

exports.searchSchoolsResults = async function (req, res) {
  const { school } = req.body;
  const { address } = req.body;
  const { postCode } = req.body;
  const { status } = req.body;
  const { email } = req.body;
  const { createdDt } = req.body;

  const result = await models.sequelize.query(
    'select s.name,s.address, s.postCode, stp.type,s.email,DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as createdDttm, s.id from schools s '
                                 + ' inner join statuses st on st.schoolFk = s.id '
                                 + ' inner join statusTypes stp on st.statusTypeFk = stp.id '
                                 + ' inner join accounts a on s.email = a.email '
                                 + ' where s.name like :name '
                                 + ' and s.address like :address '
                                 + ' and s.postCode like :postCode '
                                 + ' and stp.type like :status '
                                 + ' and s.email like :email '
                                 + ' and a.created_at like :createdDt '
                                 + ' and st.id = (select id from statuses where schoolFk = s.id order by createdDttm desc limit 1)',
    {
      replacements: {
        name: `%${school}%`,
        address: `%${address}%`,
        postCode: `%${postCode}%`,
        status: `%${status}%`,
        email: `%${email}%`,
        createdDt: `%${createdDt}%`,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  res.json({ result });
};

exports.sendMissingEmail = function (req, res) {
  models.purchaseBasket.findOne({
    where: {
      id: 121,
    },
  }).then((purchaseBasket) => {
    models.sequelize.query('select b.*, k.name, k.age,k.code, a.email,s.name as school,s.postCode, p.name as packageName, if(k.displayAge=true,:yes,:no) as displayAge,if(k.displayClass=true,:yes,:no) as displayClass,if(k.displaySchool=true,:yes,:no) as displaySchool, FORMAT(b.cost,2) as cost from basketitems b '
    + ' inner join kids k on b.kidFk = k.id '
    + ' inner join classes c on k.classFk = c.id '
    + ' inner join schools s on c.schoolFk = s.id '
    + ' inner join accounts a on k.parentAccountFk = a.id '
    + ' inner join packages p on b.packageFk = p.id '
    + ' where purchaseBasketFk = :purchaseBasketId ', { replacements: { purchaseBasketId: purchaseBasket.id, yes: 'Yes', no: 'No' }, type: models.sequelize.QueryTypes.SELECT })
      .then(async (basketItems) => {
        // console.log(basketItems);
        const now = new Date();

        if (basketItems.length == 0) {
          basketItems = await models.sequelize.query(
            'select b.*,a.email,  p.name as packageName, FORMAT(b.cost,2) as cost from basketItems b '
                 + ' inner join packages p on b.packageFk = p.id '
                 + ' inner join accounts a on b.accountFk = a.id ',
            ' where purchaseBasketFk = :purchaseBasketId ',
            { replacements: { purchaseBasketId: purchaseBasket.id }, type: models.sequelize.QueryTypes.SELECT },
          );
        }

        console.log(basketItems);
        await asyncForEachPurchase(basketItems, dashboardController.addKidOrderHistory);
        let purchaseDttm = now;
        let month = purchaseDttm.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;
        let days = purchaseDttm.getDate();
        days = days < 10 ? `0${days}` : days;
        const years = purchaseDttm.getFullYear();

        let hours = purchaseDttm.getHours();
        hours = hours < 10 ? `0${hours}` : hours;
        let minutes = purchaseDttm.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;
        let seconds = purchaseDttm.getSeconds();
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        const time = `${hours}:${minutes}:${seconds}`;
        purchaseDttm = `${years}-${month}-${days}`;
        let { total } = purchaseBasket;
        total = (parseFloat(total)).toFixed(2);
        await queueController.addPurchaseEmailJob('purchaseEmail', basketItems, `blu-${purchaseBasket.id}`, purchaseBasket.purchaseDttm, purchaseBasket.total, time);
        await queueController.addPurchaseEmailJob('purchaseEmailToBluwave', basketItems, `blu-${purchaseBasket.id}`, purchaseBasket.purchaseDttm, purchaseBasket.total, time);
        res.json({});
      });
  });
};

const asyncForEachPurchase = async function (basketItems, callback) {
  for (let i = 0; i < basketItems.length; i++) {
    await callback(basketItems[i]);
  }
};

exports.getOrder = function (req, res) {
  // return basketitems attached to purchasebasket
  const { id } = req.query;
  // console.log(id);
  models.sequelize.query('select distinct k.*,b.*, s.name as schoolName, c.name as className, p.name as packageName,pb.total,p.price,pb.purchaseDttm,pb.shippedFl,pb.shippingAddressFk, DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm from purchaseBaskets pb '
      + ' inner join basketitems b on b.purchaseBasketFk = pb.id '
      + ' inner join kids k on b.kidFk = k.id '
      + ' inner join packages p on b.packageFk = p.id '
      + ' inner join classes c on k.classFk = c.id '
      + ' inner join schools s on c.schoolFk = s.id '
      + ' where pb.id = :pbId ', { replacements: { pbId: id }, type: models.sequelize.QueryTypes.SELECT })
    .then(async (basketItems) => {
      // console.log(basketItems);
      const basketItems2 = await models.sequelize.query('select b.*,a.email,  p.name as packageName, FORMAT(b.cost,2) as cost,pb.total,p.price,pb.purchaseDttm,pb.shippingAddressFk,pb.shippedFl,DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm  from basketItems b '
                            + ' inner join packages p on b.packageFk = p.id '
                            + ' inner join accounts a on b.accountFk = a.id '
                            + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                            + ' where b.purchaseBasketFk = :purchaseBasketId '
                            + ' and b.kidFk is null ', { replacements: { purchaseBasketId: id }, type: models.sequelize.QueryTypes.SELECT });

      basketItems2.forEach((item) => {
        basketItems.push(item);
      });

      const basketItem = basketItems[0];
      const { total } = basketItem;
      let date = basketItem.purchaseDttm;

      let month = date.getMonth() + 1;
      month = month < 10 ? `0${month}` : month;
      let days = date.getDate();
      days = days < 10 ? `0${days}` : days;
      const years = date.getFullYear();
      let hours = date.getHours();
      hours = hours < 10 ? `0${hours}` : hours;
      let minutes = date.getMinutes();
      minutes = minutes < 10 ? `0${minutes}` : minutes;
      let seconds = date.getSeconds();
      seconds = seconds < 10 ? `0${seconds}` : seconds;
      date = `${years}-${month}-${days} ${hours}:${minutes}:${seconds}`;

      models.account.findOne({
        where: {
          id: basketItem.accountFk,
        },
      }).then((parentAccount) => {
        models.purchaseBasket.findOne({
          where: {
            id,
          },
        }).then(async (purchaseBasket) => {
          const shipping = await models.shippingAddress.findOne({
            where: {
              id: purchaseBasket.shippingAddressFk,
            },
          });
          let country = null;
          if (shipping != null) {
            country = await models.country.findOne({
              where: {
                id: shipping.countryFk,
              },
            });
          }
          res.render('orders', {
            user: req.user,
            basketItems,
            total: parseFloat(total),
            date,
            purchaseBasketId: id,
            shipping,
            parentAccountTypeFk: parentAccount.accountTypeFk,
            email: parentAccount.email,
            orderAccountId: parentAccount.id,
            orderNo: `blu-${id}`,
            country,
          });
        });
      });
    });
};

exports.searchCards = async function (req, res) {
  res.render('searchKids', { user: req.user });
};

exports.viewCreatedCards = function (req, res) {
  const { classId } = req.query;
  models.sequelize.query(
    'select c.* from cards c '
                         + ' inner join kids k on c.kidFk = k.id '
                         + ' inner join classes cl on k.classFk = cl.id '
                         + ' where cl.id = :classId '
                         + ' and k.deleteFl = false ',
    { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
  )
    .then((cards) => {
      viewCreatedCards(cards, classId, req, res, req.query.selectedIndex);
    });
};

exports.getKids = function (req, res) {
  return models.kid.findAll({
    where: {
      classFk: req.query.classId,
      deleteFl: false,
    },
    order: [
      ['name', 'ASC'],
    ],
  }).then((kids) => {
    const array = new Array();

    kids.forEach((kid) => {
      array.push(kid.dataValues);
    });

    return res.json(array);
  });
};

exports.createCardsForClass = async function (req, res) {
  const { classId } = req.body;
  const totalSteps = await models.kid.findAll({
    where: {
      classFk: classId,
    },
  }).then((kids) => kids.length * 4);

  if (totalSteps == 0) {
    res.json({ errors: 'No kids in this class to create cards for. Please add kids before trying to create cards' });
  } else {
    const job = await queueController.addCreateClassJob(classId);
    res.json({ id: job.id, totalSteps, classId });
  }
};

exports.getUpdateCalendarJob = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
};

exports.getCreateCardsForClassJob = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
};

exports.getCreateCardsForClassJob = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
};

exports.getUpdateCardJobs = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
};

exports.getCreateAdminCardJobs = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
};

exports.getUpdatePurchaseJobs = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    const path = (job.returnvalue == null) ? undefined : job.returnvalue.path;

    res.json({
      id, state, progress, reason, process, path,
    });
  }
};

exports.getUpdatePicArtworkJobs = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
};

exports.getCreatePrintFormJobs = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const form = (job.returnvalue == null) ? undefined : job.returnvalue;
    const { process } = job.data;

    res.json({
      id, state, progress, reason, form, process,
    });
  }
};

exports.editCards = function (req, res) {
  // check whether there are any cards for this class
  const errors = {};
  const { classId } = req.query;
  models.sequelize.query(
    'select c.* from cards c '
                          + ' inner join kids k on c.kidFk = k.id '
                          + ' inner join classes cl on k.classFk = cl.id '
                          + ' where cl.id = :classId '
                          + ' and k.deleteFl = false ',
    { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
  )
    .then((cards) => {
      if (cards.length == 0) {
        errors.editCards = 'No cards have been created for this class.';
        res.json({ errors });
      } else {
        res.json({});
      }
    });
};

const viewCreatedCards = function (cards, classId, req, res, selectedCardIndex) {
  models.class.findOne({
    where:
    {
      id: classId,
    },
  }).then((schoolClass) => {
    const selectedCard = cards[selectedCardIndex];

    models.sequelize.query('select s.id as schoolId, k.* from cards c inner join kids k on c.kidFk = k.id '
                          + ' inner join classes cl on k.classFk = cl.id '
                          + ' inner join schools s on cl.schoolFk = s.id '
                          + ' where c.id = :selectedCardId '
                          + ' and k.deleteFl = false ', {
      replacements: {
        selectedCardId: selectedCard.id,
      },
      type: models.sequelize.QueryTypes.SELECT,
    }).then((schoolKidArray) => {
      schoolKidArray = schoolKidArray[0];
      res.render('viewCreatedCards', {
        user: req.user, cards, schoolClass, schoolKidArray, selectedCardIndex,
      });
    });
  });
};

exports.selectPreviewCard = async function (req, res) {
  const selectedCardId = req.query.id;
  models.sequelize.query('select s.id as schoolId, k.* from cards c inner join kids k on c.kidFk = k.id '
                        + ' inner join classes cl on k.classFk = cl.id '
                        + ' inner join schools s on cl.schoolFk = s.id '
                        + ' where c.id = :selectedCardId '
                        + ' and k.deleteFl = false ', {
    replacements: {
      selectedCardId,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((schoolKidArray) => {
    schoolKidArray = schoolKidArray[0];
    res.json({ schoolKidArray });
  });
};

exports.createKid = async function (req, res) {
  // need to validate the data

  const mimeType = req.files.artwork.mimetype;
  const errors = {};
  const { classId } = req.body;
  const { name } = req.body;
  // const code = req.body.code;

  if (!(mimeType == 'image/png' || mimeType == 'image/jpeg')) {
    console.log('Error');
    errors.artwork = 'The artwork uploaded must be of type jpeg or png.';

    res.json({ errors });
  } else { // extract this to its own method at some point
    const date = Date.now();
    const s3 = new aws.S3();
    const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);

    const suffix = (req.files.artwork.mimeType == 'image/png') ? 'png' : 'jpg';
    const s3ArtworkPath = `${process.env.s3BucketPath}Artwork/${date}_${fileName}.${suffix}`;

    const params = {
      Bucket: process.env.bucketName,
      Body: req.files.artwork.data,
      Key: `Artwork/${date}_${fileName}.${suffix}`,
      ACL: 'public-read',
    };

    const s3UploadPromise = new Promise((resolve, reject) => {
      s3.upload(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    await s3UploadPromise;

    const { displayClass } = req.body;
    const { displayAge } = req.body;
    const { displaySchool } = req.body;

    const code = makeCode();
    const month = (req.body.month == '') ? 0 : req.body.month;

    createNewKid(res, code, name, req.body.age, month, classId, s3ArtworkPath, displayClass, displayAge, displaySchool);
  }
};

const createNewKid = function (res, code, name, age, month, classId, s3ArtworkPath, displayClass, displayAge, displaySchool) {
  models.kid.findOne({
    where: {
      code,
    },
  }).then((kid) => {
    if (kid == null) {
      models.kid.build({
        name,
        // code:code,
        age,
        month,
        classFk: classId,
        artwork: s3ArtworkPath,
        displayClass,
        displayAge,
        displaySchool,
        code,
        deleteFl: false,
      }).save().then((kid) => {
        // var s3Bucket = process.env.s3BucketPath + 'Calendar/';
        // models.calendar.build({
        //   kidFk:kid.id,
        //   landscapeRedPath: s3Bucket + 'defaultLandscapeRed.pdf',
        //   landscapeGreenPath:s3Bucket + 'defaultLandscapeGreen.pdf',
        //   landscapeBluePath:s3Bucket + 'defaultLandscapeBlue.pdf',
        //   landscapeRedPathPreview: s3Bucket + 'defaultLandscapeRedPreview.pdf',
        //   landscapeGreenPathPreview:s3Bucket + 'defaultLandscapeGreenPreview.pdf',
        //   landscapeBluePathPreview:s3Bucket + 'defaultLandscapeBluePreview.pdf',
        //   portraitRedPath: s3Bucket + 'defaultPortraitRed.pdf',
        //   portraitGreenPath:s3Bucket + 'defaultPortraitGreen.pdf',
        //   portraitBluePath:s3Bucket + 'defaultPortraitBlue.pdf',
        //   portraitRedPathPreview: s3Bucket + 'defaultPortraitRedPreview.pdf',
        //   portraitGreenPathPreview:s3Bucket + 'defaultPortraitGreenPreview.pdf',
        //   portraitBluePathPreview:s3Bucket + 'defaultPortraitBluePreview.pdf',
        // }).save().then(()=>{

        res.json({ success: 'success' });
        // })
      });
    } else {
      code = makeCode();
      createNewKid(res, code, name, age, month, classId, s3ArtworkPath, displayClass, displayAge, displaySchool);
    }
  });
};

exports.makeCode = function () {
  return makeCode();
};
const makeCode = function () {
  let result = '';
  const characters = '23456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 7; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

exports.getAccounts = function (req, res) {
  const { name } = req.body;
  const { email } = req.body;
  const { accountType } = req.body;
  const { createdDt } = req.body;
  const { telephone } = req.body;

  console.log(telephone);
  models.sequelize.query(
    'select a.id, a.name, a.email, a.telephoneNumber as telephone, at.accountType, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as createdDt from accounts a '
                + ' inner join accountTypes at on a.accountTypeFk = at.id '
                + ' where (a.name like :name or a.name is null )'
                + ' and a.email like :email '
                + ' and a.accountTypeFk like :accountType '
                + ' and a.telephoneNumber like :telephone '
                + ' and a.created_at like :createdDt order by a.created_at desc',
    {
      replacements: {
        name: `%${name}%`,
        email: `%${email}%`,
        accountType: `%${accountType}%`,
        telephone: `%${telephone}%`,
        createdDt: `%${createdDt}%`,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  )
    .then((accounts) => {
      res.json({ result: accounts });
    });
};

exports.searchClass = function (req, res) {
  res.render('searchClass', { user: req.user });
};

exports.searchAccounts = function (req, res) {
  models.accountType.findAll().then((accountTypes) => {
    res.render('searchAccounts', { user: req.user, accountTypes });
  }).catch((err) => {
    console.log(err);
  });
};

exports.reece = function (req, res) {
  console.log(req.body.reece);
};

exports.updateCard = async function (req, res) {
  // to be changed to just be for updating when from the viewcards from the class screen after

  const classFk = req.body.classId;

  const kidId = req.body.selectedKidId;
  const { age } = req.body;
  const { name } = req.body;
  let displaySchool = req.body.schoolCheckBox;
  let displayClass = req.body.classCheckBox;
  let displayAge = req.body.ageCheckBox;

  displaySchool = displaySchool == 'true';
  displayClass = displayClass == 'true';
  displayAge = displayAge == 'true';
  const job = await queueController.addUpdateCardJob(classFk, kidId, age, name, displaySchool, displayClass, displayAge, req.files);
  res.json({ id: job.id, classId: req.body.classId, selectedCardIndex: req.body.selectedCardIndex });
};

exports.updateCalendar = async function (req, res) {
  const { kidId } = req.body;
  const { calendarId } = req.body;

  const job = await queueController.updateCalendarJob(kidId, calendarId);
  res.json({
    id: job.id, totalSteps: 32, accountType: req.user.accountTypeFk, kidId,
  });
};

exports.getProductItemJob = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
};

exports.updateProductItem = async function (req, res) {
  const { productItemId } = req.body;

  const job = await queueController.updateProductItemJob(productItemId);
  res.json({ id: job.id, totalSteps: 8 });
};

exports.updateCardArtworkAndPicture = function (req, res) {
  const errors = {};
  const { kidId } = req.body;
  const { age } = req.body;
  const { month } = req.body;
  const { name } = req.body;
  let displaySchool = req.body.schoolCheckBox;
  let displayClass = req.body.classCheckBox;
  let displayAge = req.body.ageCheckBox;
  const { isPictureUpdated } = req.body;
  displaySchool = displaySchool == 'true';
  displayClass = displayClass == 'true';
  displayAge = displayAge == 'true';

  models.kid.findOne({
    where: {
      id: kidId,
    },
  }).then(async (kid) => {
    if (kid.name == name && kid.age == age
    && kid.displaySchool == displaySchool && kid.displayAge == displayAge && kid.displayClass == displayClass
   && req.files === null && kid.month == month && !isPictureUpdated) {
    // nothing to change
      errors.noChange = 'Nothing to update';
      res.json({ errors });
    } else {
      const job = await queueController.addArtworkPicJob(
        kidId,
        name,
        age,
        displaySchool,
        month,
        displayClass,
        displayAge,
        req.files,
      );
      res.json({
        id: job.id, totalSteps: 6, accountType: req.user.accountTypeFk, kidId,
      });
    }
  });
};

exports.createCardAdmin = async function (req, res) {
  const { kidId } = req.body;
  const job = await queueController.addCreateCardAminJob(kidId);
  res.json({
    id: job.id, kidId, accountType: req.user.accountTypeFk, totalSteps: 4,
  });
};

exports.getDelivery = function (req, res) {
  models.deliveryCost.findOne({
    where: {
      name: 'International',
    },
  }).then((deliveryCost) => {
    res.json({ deliveryCost });
  });
};

exports.createPackage = async function (req, res) {
  console.log(req.body);

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: req.files.fileToUpload.data,
    Key: `Packages/${req.files.fileToUpload.name}`,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await s3UploadPromise;

  const s3Path = `${process.env.s3BucketPath}Packages/${req.files.fileToUpload.name}`;

  models.package.build({
    name: req.body.packageName,
    price: req.body.packagePrice,
    imagePath: s3Path,
  }).save();

  res.render('addPackage', { user: req.user });
};

exports.viewPackages2 = async function () {
  return await models.package.findAll({
  }).then((packagesResult) => {
    const packages = new Array();

    packagesResult.forEach((p) => {
      packages.push(p);
    });

    return packages;
  });
};

exports.viewPackages = async function (req, res) {
  const packages = viewPackages2();

  res.render('viewPackages', { user: req.user, packages });
};

exports.reset = function (req, res) {
  let { from } = req.query;
  let { to } = req.query;
  const { email } = req.query;

  const now = Date.now();

  from = parseFloat(from);
  to = parseFloat(to);
  // first check resetEmail exists

  models.resetEmail.findOne({
    where: {
      fromDttm: from,
      toDttm: to,
      email,
    },
  }).then((resetEmail) => {
    if (resetEmail == null) {
      // display error/ invalid link
      res.render('reset2', { valid: false });
    } else if (now < to && !resetEmail.usedFl) {
      // valid
      valid = true;
      models.resetEmail.update({
        usedFl: true,
        versionNo: models.sequelize.literal('versionNo + 1'),
      }, {
        where: {
          email,
        },
      }).then(() => {
        res.render('reset2', { valid: true, email });
      });
    } else {
      // invalid
      res.render('reset2', { valid: false, expired: true });
    }
  }).catch((err) => {
    console.log(err);
  });
};

exports.resetSent = function (req, res) {
  res.render('resetSent2');
};

exports.sendForgotEmail = function (req, res) {
  const { email } = req.body;

  models.account.findOne({
    where: {
      email,
    },
  }).then(async (account) => {
    if (account == null) {
      res.json({ errors: `No registered account with email ${email}. Please sign up or double check you have entered the correct email address` });
    } else {
      // schedule sending of email

      await queueController.addResetEmailJob(email);

      res.json({ success: 'success' });
    }
  });
};

exports.forgotten = function (req, res) {
  res.render('forgottenPassword2');
};

exports.generateOrderItems = function (req, res) {
  const { id } = req.body;
  console.log('got here');
  models.basketItem.findAll({
    where: {
      purchaseBasketFk: id,
    },
  }).then((basketItems) => {
    models.kid.findOne({
      where: {
        id: basketItems[0].id,
      },
    }).then(async (kid) => {
      const job = await queueController.addPurchaseCardsJob((kid == null) ? '0' : kid.classFk, basketItems);

      // need to return job
      res.json({ id: job.id });
    });
  });
};

exports.amountConfirmed = function (req, res) {
  res.render('amountConfirmed', { user: req.user });
};

exports.getSchoolScreen = async function (req, res) {
  const schoolId = req.query.id;

  // redo to account for steps where next step is null to now account for the waiting step
  var school = await models.sequelize.query('select s.*, sts.type, sts.id as typeId, sts.nextTypeFk  from schools s '
  + ' inner join statuses st on st.schoolFk = s.id '
  + ' inner join statusTypes sts on st.statusTypeFk = sts.id '
  // ' inner join statusTypes sts2 on sts.nextTypeFk = sts2.id ' +
  + ' where s.id = :schoolId '
  + ' order by st.createdDttm desc, st.statusTypeFk desc LIMIT 1', {
    replacements: {
      schoolId,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });

  const nextSteps = new Array();
  var school = school[0];
  if (school.nextTypeFk == null) {
    if (school.typeId == 8) {
      nextSteps.push({ id: 9, type: 'Delay' });
      nextSteps.push({ id: 10, type: 'Printing' });
    }
  } else {
    const statusType = await schoolUtility.getStatusTypeById(school.nextTypeFk);
    nextSteps.push({ id: school.nextTypeFk, type: statusType.type });
  }

  models.sequelize.query('select c.*, y.year from classes c '
  + ' inner join schools s on c.schoolFk = s.id '
  + ' inner join years y on c.yearFk = y.id '
  + ' where s.id = :schoolId '
  + ' order by c.name asc', {
    replacements: {
      schoolId,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((classes) => {
    const classTotal = classes.length;

    models.deadLine.findOne({
      where: {
        schoolFk: schoolId,
      },
    }).then((deadLine) => {
      let deadLineDttm = '';
      let daysLeft;
      const now = Date.now();
      if (deadLine != null) {
        const unparsedDeadLine = deadLine.deadLineDttm;

        let month = unparsedDeadLine.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;
        let days = unparsedDeadLine.getDate();
        days = days < 10 ? `0${days}` : days;
        const years = unparsedDeadLine.getFullYear();

        deadLineDttm = `${years}-${month}-${days}`;

        const unparsedDeadlineTime = unparsedDeadLine.getTime();
        daysLeft = unparsedDeadlineTime - now;
        daysLeft /= (1000 * 60 * 60 * 24);

        var daysLeftSign;
        if (daysLeft < 0) {
          daysLeft = Math.ceil(daysLeft);
          if (daysLeft == 0) daysLeftSign = 'zero';
          else daysLeftSign = 'negative';
        } else if (daysLeft == 0) {
          daysLeftSign = 'zero';
        } else {
          daysLeft = Math.ceil(daysLeft);
          if (daysLeft == 0) daysLeftSign = 'zero';
          else daysLeftSign = 'postive';
        }
      }
      models.sequelize.query(
        'select k.* from kids k '
                                + ' inner join classes c on k.classFk = c.id '
                                + ' inner join schools s on c.schoolFk = s.id '
                                + ' where s.id = :schoolId '
                                + ' and k.deleteFl = false ',
        { replacements: { schoolId }, type: models.sequelize.QueryTypes.SELECT },
      ).then((kids) => {
        const kidTotal = kids.length;

        models.sequelize.query(
          'select distinct k.* from kids k '
                                    + ' inner join classes c on k.classFk = c.id '
                                    + ' inner join schools s on c.schoolFk = s.id '
                                    + ' inner join basketitems b on b.kidFk = k.id '
                                    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                    + ' where s.id = :schoolId '
                                    + ' and pb.status = :completed '
                                    + ' and k.deleteFl = false ',
          { replacements: { schoolId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
        ).then((orderedKids) => {
          const currentYear = new Date().getFullYear();

          models.year.findOne({
            where: {
              year: currentYear,
            },
          }).then((year) => {
            const orderedKidTotal = orderedKids.length;
            let orderedPercentage = (orderedKidTotal / kidTotal) * 100;
            orderedPercentage = Math.round(orderedPercentage * 10) / 10;
            orderedPercentage = isNaN(orderedPercentage) ? 0 : orderedPercentage;

            models.sequelize.query('select * from schools s '
                                                      + ' inner join accounts a on a.email = s.email '
                                                      + ' where s.id = :schoolId', { replacements: { schoolId }, type: models.sequelize.QueryTypes.SELECT })
              .then((organiser) => {
                organiser = organiser.length == 1;

                models.sequelize.query('select distinct c.*, y.year from classes c '
                                                  + ' inner join schools s on c.schoolFk = s.id '
                                                  + ' inner join years y on c.yearFk = y.id '
                                                  + ' inner join kids k on k.classFk = c.id '
                                                  + ' inner join basketitems b on b.kidFk = k.id '
                                                  + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                                  + ' where s.id = :schoolId '
                                                  + ' and pb.status = :completed '
                                                  + ' order by c.name asc', {
                  replacements: {
                    schoolId, completed: 'Completed',
                  },
                  type: models.sequelize.QueryTypes.SELECT,
                }).then((classesWithOrders) => {
                  if (year == null) {
                    models.year.build({
                      year: currentYear,
                    }).save().then((year) => {
                      res.render('school', {
                        user: req.user,
                        school,
                        classList: classes,
                        kidTotal,
                        orderedKidTotal,
                        orderedPercentage,
                        classTotal,
                        deadLineDttm,
                        daysLeft,
                        yearId: year.id,
                        organiser,
                        daysLeftSign,
                        classesWithOrders,
                        nextSteps,
                      });
                    });
                  } else {
                    res.render('school', {
                      user: req.user,
                      school,
                      classList: classes,
                      kidTotal,
                      orderedKidTotal,
                      orderedPercentage,
                      classTotal,
                      deadLineDttm,
                      daysLeft,
                      yearId: year.id,
                      organiser,
                      daysLeftSign,
                      classesWithOrders,
                      nextSteps,
                    });
                  }
                });
              });
          });
        });
      });
    });
  });
};

exports.generateCard = function (req, res) {
  const { kidId } = req.body;
  const { selectedPackage } = req.body;

  models.card.findOne({
    where: {
      kidFk: kidId,
    },
  }).then((card) => {
    const path = (selectedPackage == 1) ? card.path : card.package2Path;

    res.json({ path });
  });
};

exports.createYourOwnCard = function (req, res) {
  const accountId = req.user.id;
  models.sequelize.query('select k.* from kids k '
        + ' inner join classes c on k.classFk = c.id '
        + ' inner join schools s on c.schoolFk = s.id '
        + ' where s.name = :name '
        + ' and k.parentAccountFk = :accountId ', { replacements: { name: 'Individuals', accountId }, type: models.sequelize.QueryTypes.SELECT })
    .then(async (kids) => {
      if (kids.length > 0) {
        const kidId = kids[0].id;
        req.query.id = kidId;
        dashboardController.kid(req, res);
      } else {
        await createDummyKid(req, res, accountId);
      }
    });
};

async function deleteBasketItem(value) {
  models.basketItem.destroy({
    where: {
      id: value,
    },
  });
}

async function deletePurchaseBasket(value) {
  models.purchaseBasket.destroy({
    where: {
      id: value,
    },
  });
}

async function deleteShipping(value) {
  models.shipping.destroy({
    where: {
      id: value,
    },
  });
}

async function forEachDeleteBasketItemPurchaseBasket(set, callback) {
  for (let i = 0; i < set.values(); i++) {
    await callback(set.next());
  }
}

exports.getAccount = function (req, res) {
  const { accountNumber } = req.query;

  models.account.findOne({
    where: {
      accountNumber,
    },
  }).then((account) => {
    models.accountType.findOne({
      where: {
        id: account.accountTypeFk,
      },
    }).then((accountType) => {
      models.kid.findAll({
        where: {
          parentAccountFk: account.id,
        },
      }).then((kids) => {
        models.sequelize.query(
          'select distinct pb.* from basketitems b '
                          + ' inner join accounts a on b.accountFk = a.id '
                          + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                          + ' where pb.status = :completed '
                          + ' and a.id = :accountId',
          { replacements: { completed: 'Completed', accountId: account.id }, type: models.sequelize.QueryTypes.SELECT },
        )
          .then((orders) => {
            res.render('account', {
              user: req.user,
              account,
              accountType: accountType.accountType,
              kids,
              orders,
            });
          });
      });
    });
  });
};

exports.generateCalendar = function (req, res) {
  const { calendarId } = req.body;
  const { color } = req.body;
  const { orientation } = req.body;

  models.calendar.findOne({
    where: {
      id: calendarId,
    },
  }).then((calendar) => {
    let calendarPath;
    if (orientation == 'portrait') {
      if (color == 'red') calendarPath = calendar.portraitRedPath;
      else if (color == 'blue') calendarPath = calendar.portraitBluePath;
      else calendarPath = calendar.portraitGreenPath;
    } else if (color == 'red') calendarPath = calendar.landscapeRedPath;
    else if (color == 'blue') calendarPath = calendar.landscapeBluePath;
    else calendarPath = calendar.landscapeGreenPath;

    res.json({ path: calendarPath });
  });
};

exports.resetPassword = function (req, res) {
  const { password } = req.body;
  const { email } = req.body;

  const errors = validator.validateCreateUserFields(req);

  if (errors.password) {
    res.json({ errors });
  } else {
    const saltPassword = generalUtility.generateHash(password);
    models.account.update({
      password: saltPassword,
    }, {
      where: {
        email,
      },
    }).then(() => {
      res.json({ success: 'success' });
    });
  }
};

exports.changeOrganiser = function (req, res) {
  const { schoolId } = req.body;
  const { email } = req.body;
  const { originalEmail } = req.body;
  const errors = validator.validateCreateUserFields(req);

  if (errors.email) {
    res.json({ errors });
  } else {
    models.account.findOne({
      where: {
        email,
      },
    }).then((account) => {
      if (account == null) {
        // safe to update accounts email and default the password to welcome
        // and update the schools email

        const saltPassword = generalUtility.generateHash('welcome');

        models.school.update({
          email,
        }, {
          where: {
            id: schoolId,
          },
        }).then(() => {
          models.account.update({
            email,
            password: saltPassword,
            defaultPassword: true,
          }, {
            where: {
              email: originalEmail,
            },
          }).then(() => {
            res.json({ success: 'success' });
          });
        });
      } else {
        errors.email = 'This email is already being used for another account please use another email address';

        res.json({ errors });
      }
    });
  }
};

exports.getChangeOrganiser = function (req, res) {
  const { schoolId } = req.query;
  models.school.findOne({
    where: {
      id: schoolId,
    },
  }).then((school) => {
    res.render('changeOrganiser', { user: req.user, school });
  });
};

exports.getEditContactDetails = function (req, res) {
  const { schoolId } = req.query;

  models.school.findOne({
    where: {
      id: schoolId,
    },
  }).then((school) => {
    models.account.findOne({
      where: {
        id: school.organiserAccountFk,
      },
    }).then((account) => {
      res.render('editContactDetails', { user: req.user, school, account });
    });
  });
};

exports.updatePassword = function (req, res) {
  const { password } = req.body;
  const { repeat } = req.body;

  if (repeat == password) {
    if (repeat == 'welcome') {
      res.json({ errors: 'Please update to a new password' });
    } else {
      const errors = validator.validateCreateUserFields(errors, req);

      if (errors.password) {
        res.json({ errors: errors.password });
      } else {
        const saltPassword = generalUtility.generateHash(password);

        models.account.update({
          password: saltPassword,
          defaultPassword: false,
        }, {
          where: {
            id: req.user.id,
          },
        }).then(() => {
          res.json({ success: 'success' });
        });
      }
    }
  } else {
    res.json({ errors: "The passwords don't match" });
  }
};

exports.getUpdatePassword = function (req, res) {
  res.render('updatePassword', { user: req.user });
};

exports.editClassName = function (req, res) {
  const { classId } = req.body;
  const { newName } = req.body;
  const { schoolId } = req.body;

  models.class.findOne({
    where: {
      name: newName,
      schoolFk: schoolId,
    },
  }).then((schoolClass) => {
    if (schoolClass == null) {
      // update
      models.class.update({
        name: newName,
      }, {
        where: {
          id: classId,
        },
      }).then(() => {
        res.json({ success: 'success' });
      });
    } else {
      res.json({ error: 'A class with this name already exists for this school' });
    }
  });
};
exports.editContactDetails = function (req, res) {
  const { schoolId } = req.body;

  console.log('edit');
  // validate values
  const errors = validator.validateCreateUserFields(errors, req);

  if (errors.telephoneNo || errors.postCode || errors.address || errors.name || errors.numberOfPupils || errors.numberOfClasses) {
    // error
    res.json({ errors });
  } else {
    models.school.update({
      address: req.body.address,
      postCode: req.body.postCode,
      number: req.body.telephoneNo,
      name: req.body.name,
      numberOfClasses: req.body.numberOfCLasses,
      numberOfPupilsPerClass: req.body.numberOfPupils,
    }, {
      where: {
        id: schoolId,
      },
    }).then(() => {
      models.school.findOne({

        where: {
          id: schoolId,
        },
      }).then((school) => {
        models.account.update(
          {
            name: req.body.organiserName,
          },
          {
            where: {
              email: school.email,
            },
          },
        ).then(() => {
          res.json({ success: 'success' });
        });
      });
    });
  }
};

exports.searchSchools = function (req, res) {
  models.statusType.findAll().then((statuses) => {
    res.render('searchSchool', { user: req.user, statuses });
  });
};

exports.viewProofs = function (req, res) {
  const errors = {};
  const { classId } = req.query;
  console.log(classId);
  models.class.findOne({
    where: {
      id: classId,
    },
  }).then((schoolClass) => {
    if (schoolClass.proofPath == null) {
      errors.viewProofs = 'No proof has been created for this class';
      res.json({ errors });
    } else {
      res.json({ proofPath: schoolClass.proofPath });
    }
  });
};

exports.printCard = function (req, res) {
  const errors = {};
  const { cardId } = req.query;
  models.card.findOne({
    where: {
      id: cardId,
    },
  }).then((card) => {
    if (card.path == null) {
      errors.card = 'No card has been created for this kid';
      res.json({ errors });
    } else {
      res.json({ path: card.path });
    }
  });
};

exports.generatePurchasedCards = function (req, res) {
  const { classId } = req.query;

  models.sequelize.query('select distinct b.* from basketitems b '
              + ' inner join kids k on b.kidFk = k.id '
              + ' inner join classes c on k.classFk = c.id '
              + ' inner join purchaseBaskets p on b.purchaseBasketFk = p.id '
              + ' where c.id = :classId '
              + ' and k.deleteFl = false '
              + ' and p.status = :completed order by k.name asc', {
    replacements: { classId, completed: 'Completed' },
    type: models.sequelize.QueryTypes.SELECT,
  })
    .then(async (purchasedBasketItems) => {
      const purchasedExtras = await models.sequelize.query('select b.* from basketItems b '
                                          + ' inner join purchaseBaskets pb on b.purchaseBasketfk = pb.id '
                                          + ' inner join packages p on b.packageFk = p.id '
                                          + ' inner join kids k on k.parentAccountFk = b.accountFk '
                                          + ' where (b.kidfk is null or b.kidFk in (select k.id from kids k inner join classes c on k.classFk = c.id where c.name = :className and k.parentAccountFk  = b.accountFk))'
                                          + ' and pb.status = :completed '
                                          + ' and b.accountFk in '
                                          + ' (select distinct a.id from classes c '
                                          + ' inner join kids k on k.classfk  = c.id '
                                          + ' inner join accounts a on k.parentAccountfk = a.id '
                                          + ' inner join schools s on c.schoolFk = s.id '
                                          + ' where c.id = :classId ) '
                                          + ' and k.classFk = :classId ', { replacements: { classId, className: 'Individual Class', completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT });

      purchasedExtras.forEach((extra) => {
        purchasedBasketItems.push(extra);
      });
      if (purchasedBasketItems.length == 0) {
        res.json({ errors: 'No purchased Items for this class' });
      } else {
        const job = await queueController.addPurchaseCardsJob(classId, purchasedBasketItems);
        res.json({ id: job.id });
      }
    });
};

exports.getCard = function (req, res) {
  const { cardId } = req.query;
  models.card.findOne({
    where:
    {
      id: cardId,
    },
  }).then((card) => {
    res.json({ card, accountType: req.user.accountTypeFk });
  });
};

exports.getKid = function (req, res) {
  const { kidId } = req.query;
  models.kid.findOne({
    where: {
      id: kidId,
    },
  }).then((kid) => {
    res.json({ kid });
  });
};

exports.deleteKid = function (req, res) {
  const { kidId } = req.body;

  models.kid.findOne({
    where:
    {
      id: kidId,
    },
  }).then((kid) => {
    const classId = kid.classFk;
    models.kid.update(
      {
        deleteFl: true,
      },
      {
        where: {
          id: kidId,
        },
      },
    ).then(() => {
      res.json({ classId });
    });
  });
};

exports.orderSearch = function (req, res) {
  res.render('searchOrders', { user: req.user });
};

exports.getKidCardPath = function (req, res) {
  models.card.findAll({
    where: {
      kidFk: req.query.kidIds,
    },
  }).then((kidsCards) => {
    res.json({ kidsCards });
  });
};

exports.getCalendar = function (req, res) {
  const { calendarId } = req.query;

  models.calendar.findOne({
    where: {
      id: calendarId,
    },
  }).then((calendar) => {
    res.json({ calendar, accountType: req.user.accountTypeFk });
  });
};

exports.getCalendar2 = function (req, res) {
  const { calendarId } = req.query;
  const { color } = req.query;
  const { orientation } = req.query;
  const accountType = req.user.accountTypeFk;
  let canvas;
  let calendarPath;
  models.calendar.findOne({
    where: {
      id: calendarId,
    },
  }).then((calendar) => {
    if (accountType == 1) {
      if (orientation == 'portrait') {
        if (color == 'red') calendarPath = calendar.portraitRedPath;
        else if (color == 'blue') calendarPath = calendar.portraitBluePath;
        else calendarPath = calendar.portraitGreenPath;
      } else if (color == 'red') calendarPath = calendar.landscapeRedPath;
      else if (color == 'blue') calendarPath = calendar.landscapeBluePath;
      else calendarPath = calendar.landscapeGreenPath;
      canvas = 'mainCanvas';
    } else {
      if (orientation == 'portrait') {
        if (color == 'red') calendarPath = calendar.portraitRedPathPreview;
        else if (color == 'blue') calendarPath = calendar.portraitBluePathPreview;
        else calendarPath = calendar.portraitGreenPathPreview;
      } else if (color == 'red') calendarPath = calendar.landscapeRedPathPreview;
      else if (color == 'blue') calendarPath = calendar.landscapeBluePathPreview;
      else calendarPath = calendar.landscapeGreenPathPreview;
      canvas = 'parentCanvas';
    }
    res.json({ calendarPath, canvas });
  });
};

const createDummyKid = async function (req, res, accountId) {
  let code = await makeCode();
  const name = 'John Doe';
  const age = 5;
  const month = 0;
  const displayClass = false;
  const displayAge = true;
  const displaySchool = false;
  const s3ArtworkPath = 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Artwork/Default/goesHere.png?versionId=on3S9HuQzOw9ODk7DAJZXu289axUWjeL';

  await models.class.findOne({
    where: {
      name: 'Individual Class',
    },
  }).then((schoolClass) => {
    const classId = schoolClass.id;
    models.kid.findOne({
      where: {
        code,
      },
    }).then(async (kid) => {
      if (kid == null) {
        models.kid.build({
          name,
          age,
          month,
          classFk: classId,
          artwork: s3ArtworkPath,
          displayClass,
          displayAge,
          displaySchool,
          code,
          parentAccountFk: accountId,
          deleteFl: false,
        }).save().then(() => {
          models.kid.findOne({
            where: {
              code,
            },
          }).then((newKid) => {
            console.log(newKid.id);
            req.query.id = newKid.id;
            models.card.build({
              path: 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Dummy+School/2019/Dummy+Individual/1570297526783_John+Doe_vP60Qg3.pdf',
              // previewPath:'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Individual/2019/Individual+Class/Previews/1571185889779_John+Doe_kgxJxn3.pdf',
              fileName: 'Dummy+School/2019/Dummy+Individual/1570297526783_John+Doe_vP60Qg3.pdf',
              // previewFileName:'Dummy+School/2019/Dummy+Individual/Previews/1570296984962_John+Doe_OJYe1SJ.pdf',
              package2Path: 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Dummy+School/2019/Dummy+Individual/1570297526783_John+Doe_vP60Qg3.pdf',
              // package2PreviewPath:'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Individual/2019/Individual+Class/Previews/1571185889779_John+Doe_kgxJxn3.pdf',
              package2FileName: 'Dummy+School/2019/Dummy+Individual/Pacakge+2/1570296984962_John+Doe_OJYe1SJ.pdf',
              // package2PreviewFileName:'Dummy+School/2019/Dummy+Individual/Pacakge+2/Previews/1570296984962_John+Doe_OJYe1SJ.pdf',
              kidFk: newKid.id,

            }).save().catch((err) => {
              console.log(err);
            }).then(() => {
              dashboardController.kid(req, res);
            });
          });
        });
      } else {
        code = await makeCode();
        createDummyKid(req, res, accountId);
      }
    });
  });
};

exports.addCountry = async function (req, res) {
  const data = [{ Code: 'AF', Name: 'Afghanistan' }, { Code: 'AX', Name: '\u00c5land Islands' }, { Code: 'AL', Name: 'Albania' }, { Code: 'DZ', Name: 'Algeria' }, { Code: 'AS', Name: 'American Samoa' }, { Code: 'AD', Name: 'Andorra' }, { Code: 'AO', Name: 'Angola' }, { Code: 'AI', Name: 'Anguilla' }, { Code: 'AQ', Name: 'Antarctica' }, { Code: 'AG', Name: 'Antigua and Barbuda' }, { Code: 'AR', Name: 'Argentina' }, { Code: 'AM', Name: 'Armenia' }, { Code: 'AW', Name: 'Aruba' }, { Code: 'AU', Name: 'Australia' }, { Code: 'AT', Name: 'Austria' }, { Code: 'AZ', Name: 'Azerbaijan' }, { Code: 'BS', Name: 'Bahamas' }, { Code: 'BH', Name: 'Bahrain' }, { Code: 'BD', Name: 'Bangladesh' }, { Code: 'BB', Name: 'Barbados' }, { Code: 'BY', Name: 'Belarus' }, { Code: 'BE', Name: 'Belgium' }, { Code: 'BZ', Name: 'Belize' }, { Code: 'BJ', Name: 'Benin' }, { Code: 'BM', Name: 'Bermuda' }, { Code: 'BT', Name: 'Bhutan' }, { Code: 'BO', Name: 'Bolivia, Plurinational State of' }, { Code: 'BQ', Name: 'Bonaire, Sint Eustatius and Saba' }, { Code: 'BA', Name: 'Bosnia and Herzegovina' }, { Code: 'BW', Name: 'Botswana' }, { Code: 'BV', Name: 'Bouvet Island' }, { Code: 'BR', Name: 'Brazil' }, { Code: 'IO', Name: 'British Indian Ocean Territory' }, { Code: 'BN', Name: 'Brunei Darussalam' }, { Code: 'BG', Name: 'Bulgaria' }, { Code: 'BF', Name: 'Burkina Faso' }, { Code: 'BI', Name: 'Burundi' }, { Code: 'KH', Name: 'Cambodia' }, { Code: 'CM', Name: 'Cameroon' }, { Code: 'CA', Name: 'Canada' }, { Code: 'CV', Name: 'Cape Verde' }, { Code: 'KY', Name: 'Cayman Islands' }, { Code: 'CF', Name: 'Central African Republic' }, { Code: 'TD', Name: 'Chad' }, { Code: 'CL', Name: 'Chile' }, { Code: 'CN', Name: 'China' }, { Code: 'CX', Name: 'Christmas Island' }, { Code: 'CC', Name: 'Cocos (Keeling) Islands' }, { Code: 'CO', Name: 'Colombia' }, { Code: 'KM', Name: 'Comoros' }, { Code: 'CG', Name: 'Congo' }, { Code: 'CD', Name: 'Congo, the Democratic Republic of the' }, { Code: 'CK', Name: 'Cook Islands' }, { Code: 'CR', Name: 'Costa Rica' }, { Code: 'CI', Name: "C\u00f4te d'Ivoire" }, { Code: 'HR', Name: 'Croatia' }, { Code: 'CU', Name: 'Cuba' }, { Code: 'CW', Name: 'Cura\u00e7ao' }, { Code: 'CY', Name: 'Cyprus' }, { Code: 'CZ', Name: 'Czech Republic' }, { Code: 'DK', Name: 'Denmark' }, { Code: 'DJ', Name: 'Djibouti' }, { Code: 'DM', Name: 'Dominica' }, { Code: 'DO', Name: 'Dominican Republic' }, { Code: 'EC', Name: 'Ecuador' }, { Code: 'EG', Name: 'Egypt' }, { Code: 'SV', Name: 'El Salvador' }, { Code: 'GQ', Name: 'Equatorial Guinea' }, { Code: 'ER', Name: 'Eritrea' }, { Code: 'EE', Name: 'Estonia' }, { Code: 'ET', Name: 'Ethiopia' }, { Code: 'FK', Name: 'Falkland Islands (Malvinas)' }, { Code: 'FO', Name: 'Faroe Islands' }, { Code: 'FJ', Name: 'Fiji' }, { Code: 'FI', Name: 'Finland' }, { Code: 'FR', Name: 'France' }, { Code: 'GF', Name: 'French Guiana' }, { Code: 'PF', Name: 'French Polynesia' }, { Code: 'TF', Name: 'French Southern Territories' }, { Code: 'GA', Name: 'Gabon' }, { Code: 'GM', Name: 'Gambia' }, { Code: 'GE', Name: 'Georgia' }, { Code: 'DE', Name: 'Germany' }, { Code: 'GH', Name: 'Ghana' }, { Code: 'GI', Name: 'Gibraltar' }, { Code: 'GR', Name: 'Greece' }, { Code: 'GL', Name: 'Greenland' }, { Code: 'GD', Name: 'Grenada' }, { Code: 'GP', Name: 'Guadeloupe' }, { Code: 'GU', Name: 'Guam' }, { Code: 'GT', Name: 'Guatemala' }, { Code: 'GG', Name: 'Guernsey' }, { Code: 'GN', Name: 'Guinea' }, { Code: 'GW', Name: 'Guinea-Bissau' }, { Code: 'GY', Name: 'Guyana' }, { Code: 'HT', Name: 'Haiti' }, { Code: 'HM', Name: 'Heard Island and McDonald Islands' }, { Code: 'VA', Name: 'Holy See (Vatican City State)' }, { Code: 'HN', Name: 'Honduras' }, { Code: 'HK', Name: 'Hong Kong' }, { Code: 'HU', Name: 'Hungary' }, { Code: 'IS', Name: 'Iceland' }, { Code: 'IN', Name: 'India' }, { Code: 'ID', Name: 'Indonesia' }, { Code: 'IR', Name: 'Iran, Islamic Republic of' }, { Code: 'IQ', Name: 'Iraq' }, { Code: 'IE', Name: 'Ireland' }, { Code: 'IM', Name: 'Isle of Man' }, { Code: 'IL', Name: 'Israel' }, { Code: 'IT', Name: 'Italy' }, { Code: 'JM', Name: 'Jamaica' }, { Code: 'JP', Name: 'Japan' }, { Code: 'JE', Name: 'Jersey' }, { Code: 'JO', Name: 'Jordan' }, { Code: 'KZ', Name: 'Kazakhstan' }, { Code: 'KE', Name: 'Kenya' }, { Code: 'KI', Name: 'Kiribati' }, { Code: 'KP', Name: "Korea, Democratic People's Republic of" }, { Code: 'KR', Name: 'Korea, Republic of' }, { Code: 'KW', Name: 'Kuwait' }, { Code: 'KG', Name: 'Kyrgyzstan' }, { Code: 'LA', Name: "Lao People's Democratic Republic" }, { Code: 'LV', Name: 'Latvia' }, { Code: 'LB', Name: 'Lebanon' }, { Code: 'LS', Name: 'Lesotho' }, { Code: 'LR', Name: 'Liberia' }, { Code: 'LY', Name: 'Libya' }, { Code: 'LI', Name: 'Liechtenstein' }, { Code: 'LT', Name: 'Lithuania' }, { Code: 'LU', Name: 'Luxembourg' }, { Code: 'MO', Name: 'Macao' }, { Code: 'MK', Name: 'Macedonia, the Former Yugoslav Republic of' }, { Code: 'MG', Name: 'Madagascar' }, { Code: 'MW', Name: 'Malawi' }, { Code: 'MY', Name: 'Malaysia' }, { Code: 'MV', Name: 'Maldives' }, { Code: 'ML', Name: 'Mali' }, { Code: 'MT', Name: 'Malta' }, { Code: 'MH', Name: 'Marshall Islands' }, { Code: 'MQ', Name: 'Martinique' }, { Code: 'MR', Name: 'Mauritania' }, { Code: 'MU', Name: 'Mauritius' }, { Code: 'YT', Name: 'Mayotte' }, { Code: 'MX', Name: 'Mexico' }, { Code: 'FM', Name: 'Micronesia, Federated States of' }, { Code: 'MD', Name: 'Moldova, Republic of' }, { Code: 'MC', Name: 'Monaco' }, { Code: 'MN', Name: 'Mongolia' }, { Code: 'ME', Name: 'Montenegro' }, { Code: 'MS', Name: 'Montserrat' }, { Code: 'MA', Name: 'Morocco' }, { Code: 'MZ', Name: 'Mozambique' }, { Code: 'MM', Name: 'Myanmar' }, { Code: 'NA', Name: 'Namibia' }, { Code: 'NR', Name: 'Nauru' }, { Code: 'NP', Name: 'Nepal' }, { Code: 'NL', Name: 'Netherlands' }, { Code: 'NC', Name: 'New Caledonia' }, { Code: 'NZ', Name: 'New Zealand' }, { Code: 'NI', Name: 'Nicaragua' }, { Code: 'NE', Name: 'Niger' }, { Code: 'NG', Name: 'Nigeria' }, { Code: 'NU', Name: 'Niue' }, { Code: 'NF', Name: 'Norfolk Island' }, { Code: 'MP', Name: 'Northern Mariana Islands' }, { Code: 'NO', Name: 'Norway' }, { Code: 'OM', Name: 'Oman' }, { Code: 'PK', Name: 'Pakistan' }, { Code: 'PW', Name: 'Palau' }, { Code: 'PS', Name: 'Palestine, State of' }, { Code: 'PA', Name: 'Panama' }, { Code: 'PG', Name: 'Papua New Guinea' }, { Code: 'PY', Name: 'Paraguay' }, { Code: 'PE', Name: 'Peru' }, { Code: 'PH', Name: 'Philippines' }, { Code: 'PN', Name: 'Pitcairn' }, { Code: 'PL', Name: 'Poland' }, { Code: 'PT', Name: 'Portugal' }, { Code: 'PR', Name: 'Puerto Rico' }, { Code: 'QA', Name: 'Qatar' }, { Code: 'RE', Name: 'R\u00e9union' }, { Code: 'RO', Name: 'Romania' }, { Code: 'RU', Name: 'Russian Federation' }, { Code: 'RW', Name: 'Rwanda' }, { Code: 'BL', Name: 'Saint Barth\u00e9lemy' }, { Code: 'SH', Name: 'Saint Helena, Ascension and Tristan da Cunha' }, { Code: 'KN', Name: 'Saint Kitts and Nevis' }, { Code: 'LC', Name: 'Saint Lucia' }, { Code: 'MF', Name: 'Saint Martin (French part)' }, { Code: 'PM', Name: 'Saint Pierre and Miquelon' }, { Code: 'VC', Name: 'Saint Vincent and the Grenadines' }, { Code: 'WS', Name: 'Samoa' }, { Code: 'SM', Name: 'San Marino' }, { Code: 'ST', Name: 'Sao Tome and Principe' }, { Code: 'SA', Name: 'Saudi Arabia' }, { Code: 'SN', Name: 'Senegal' }, { Code: 'RS', Name: 'Serbia' }, { Code: 'SC', Name: 'Seychelles' }, { Code: 'SL', Name: 'Sierra Leone' }, { Code: 'SG', Name: 'Singapore' }, { Code: 'SX', Name: 'Sint Maarten (Dutch part)' }, { Code: 'SK', Name: 'Slovakia' }, { Code: 'SI', Name: 'Slovenia' }, { Code: 'SB', Name: 'Solomon Islands' }, { Code: 'SO', Name: 'Somalia' }, { Code: 'ZA', Name: 'South Africa' }, { Code: 'GS', Name: 'South Georgia and the South Sandwich Islands' }, { Code: 'SS', Name: 'South Sudan' }, { Code: 'ES', Name: 'Spain' }, { Code: 'LK', Name: 'Sri Lanka' }, { Code: 'SD', Name: 'Sudan' }, { Code: 'SR', Name: 'Suriname' }, { Code: 'SJ', Name: 'Svalbard and Jan Mayen' }, { Code: 'SZ', Name: 'Swaziland' }, { Code: 'SE', Name: 'Sweden' }, { Code: 'CH', Name: 'Switzerland' }, { Code: 'SY', Name: 'Syrian Arab Republic' }, { Code: 'TW', Name: 'Taiwan, Province of China' }, { Code: 'TJ', Name: 'Tajikistan' }, { Code: 'TZ', Name: 'Tanzania, United Republic of' }, { Code: 'TH', Name: 'Thailand' }, { Code: 'TL', Name: 'Timor-Leste' }, { Code: 'TG', Name: 'Togo' }, { Code: 'TK', Name: 'Tokelau' }, { Code: 'TO', Name: 'Tonga' }, { Code: 'TT', Name: 'Trinidad and Tobago' }, { Code: 'TN', Name: 'Tunisia' }, { Code: 'TR', Name: 'Turkey' }, { Code: 'TM', Name: 'Turkmenistan' }, { Code: 'TC', Name: 'Turks and Caicos Islands' }, { Code: 'TV', Name: 'Tuvalu' }, { Code: 'UG', Name: 'Uganda' }, { Code: 'UA', Name: 'Ukraine' }, { Code: 'AE', Name: 'United Arab Emirates' }, { Code: 'GB', Name: 'United Kingdom' }, { Code: 'US', Name: 'United States' }, { Code: 'UM', Name: 'United States Minor Outlying Islands' }, { Code: 'UY', Name: 'Uruguay' }, { Code: 'UZ', Name: 'Uzbekistan' }, { Code: 'VU', Name: 'Vanuatu' }, { Code: 'VE', Name: 'Venezuela, Bolivarian Republic of' }, { Code: 'VN', Name: 'Viet Nam' }, { Code: 'VG', Name: 'Virgin Islands, British' }, { Code: 'VI', Name: 'Virgin Islands, U.S.' }, { Code: 'WF', Name: 'Wallis and Futuna' }, { Code: 'EH', Name: 'Western Sahara' }, { Code: 'YE', Name: 'Yemen' }, { Code: 'ZM', Name: 'Zambia' }, { Code: 'ZW', Name: 'Zimbabwe' }];

  await temp(data, temp2);
  res.json({});
};

async function temp(array, callback) {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i]);
  }
}

function temp2(country) {
  models.country.create({
    name: country.Name,
  });
}

exports.setToShipped = async function (req, res) {
  const { purchaseBasketId } = req.body;

  const purchaseBasket = await models.purchaseBasket.findOne({
    where: {
      id: purchaseBasketId,
    },
  });

  if (purchaseBasket.shippedFl == true) return res.json({ error: `Order blu-${purchaseBasketId} has already been shipped` });

  await models.purchaseBasket.update(
    {
      shippedFl: true,
      shippedDttm: Date.now(),
    },
    {
      where: {
        id: purchaseBasketId,
      },
    },
  );

  return res.json({});
};
