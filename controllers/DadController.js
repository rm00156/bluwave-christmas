const aws = require('aws-sdk');

const nodeSchedule = require('node-schedule');

const logger = require('pino')();
const models = require('../models');
const validator = require('../validators/signup');
const queueController = require('./QueueController');
const generalUtility = require('../utility/general/generalUtility');

aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

async function charityAmountBackTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 14;
  rule.minute = 56;
  // rule.second =18;
  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('charity');
    logger.info('charity amount back recurring task starting');
  });
}

async function sendFailedEmails() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 22;
  rule.minute = 14;
  rule.second = 22;
  return nodeSchedule.scheduleJob(rule, async () => {
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

          const { purchaseDttm } = purchaseBasket;

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
}

function createClass(req, res) {
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
    if (schoolClass === null) {
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
}

function getClasses(req, res) {
  return models.class.findAll({
    where: {
      schoolFk: req.query.schoolId,
      yearFk: req.query.yearId,
    },
    order: [
      ['name', 'ASC'],
    ],
  }).then((classes) => {
    const array = [];

    classes.forEach((kidClass) => {
      array.push(kidClass.dataValues);
    });

    return res.json(array);
  });
}

function getClassesWithCards(req, res) {
  return models.class.findAll({
    where: {
      schoolFk: req.query.schoolId,
      yearFk: req.query.yearId,
    },
    order: [
      ['name', 'ASC'],
    ],
  }).then((classes) => {
    const array = [];

    classes.forEach((kidClass) => {
      array.push(kidClass.dataValues);
    });

    models.kid.findAll({
      where: {
        classFk: classes,
      },
    }).then((kids) => {
      const kidArray = [];
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
}

async function searchClassResults(req, res) {
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
}

async function searchKidsResults(req, res) {
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
}

async function addPicture(req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType === 'image/png') ? 'png' : 'jpg';
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

  if (kidId === undefined || kidId === null) {
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
}

async function addArtwork(req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType === 'image/png') ? 'png' : 'jpg';
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
}

async function uploadPicture(req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType === 'image/png') ? 'png' : 'jpg';
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
  res.json({ filePath: s3PicturePath });
}

async function uploadArtwork(req, res) {
  const fileName = await models.uploadFileName.build().save().then((uploadFileName) => uploadFileName.id);
  const date = Date.now();
  const suffix = (req.files.file.mimeType === 'image/png') ? 'png' : 'jpg';
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
  res.json({ filePath: s3PicturePath });
}

async function searchSchoolsResults(req, res) {
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
}

function getKids(req, res) {
  return models.kid.findAll({
    where: {
      classFk: req.query.classId,
      deleteFl: false,
    },
    order: [
      ['name', 'ASC'],
    ],
  }).then((kids) => {
    const array = [];

    kids.forEach((kid) => {
      array.push(kid.dataValues);
    });

    return res.json(array);
  });
}

async function getUpdatePurchaseJobs(req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    const path = (job.returnvalue === null) ? undefined : job.returnvalue.path;

    res.json({
      id, state, progress, reason, process, path,
    });
  }
}

async function getUpdatePicArtworkJobs(req, res) {
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
}

async function getCreatePrintFormJobs(req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null || id === undefined) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const form = (job.returnvalue === null) ? undefined : job.returnvalue;
    const { process } = job.data;

    res.json({
      id, state, progress, reason, form, process,
    });
  }
}

function getAccounts(req, res) {
  const { name } = req.body;
  const { email } = req.body;
  const { accountType } = req.body;
  const { createdDt } = req.body;
  const { telephone } = req.body;

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
}

function searchClass(req, res) {
  res.render('searchClass', { user: req.user });
}

async function updateCard(req, res) {
  // to be changed to just be for updating when from the viewcards from the class screen after

  const classFk = req.body.classId;

  const kidId = req.body.selectedKidId;
  const { age } = req.body;
  const { name } = req.body;
  let displaySchool = req.body.schoolCheckBox;
  let displayClass = req.body.classCheckBox;
  let displayAge = req.body.ageCheckBox;

  displaySchool = displaySchool === 'true';
  displayClass = displayClass === 'true';
  displayAge = displayAge === 'true';
  const job = await queueController.addUpdateCardJob(classFk, kidId, age, name, displaySchool, displayClass, displayAge, req.files);
  res.json({ id: job.id, classId: req.body.classId, selectedCardIndex: req.body.selectedCardIndex });
}

async function getProductItemJob(req, res) {
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
}

function updateCardArtworkAndPicture(req, res) {
  const errors = {};
  const { kidId } = req.body;
  const { age } = req.body;
  const { month } = req.body;
  const { name } = req.body;
  let displaySchool = req.body.schoolCheckBox;
  let displayClass = req.body.classCheckBox;
  let displayAge = req.body.ageCheckBox;
  const { isPictureUpdated } = req.body;
  displaySchool = displaySchool === 'true';
  displayClass = displayClass === 'true';
  displayAge = displayAge === 'true';

  models.kid.findOne({
    where: {
      id: kidId,
    },
  }).then(async (kid) => {
    if (kid.name === name && kid.age === age
    && kid.displaySchool === displaySchool && kid.displayAge === displayAge && kid.displayClass === displayClass
   && req.files === null && kid.month === month && !isPictureUpdated) {
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
}

function reset(req, res) {
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
    if (resetEmail === null) {
      // display error/ invalid link
      res.render('reset2', { valid: false });
    } else if (now < to && !resetEmail.usedFl) {
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
    logger.error(err);
  });
}

function resetSent(req, res) {
  res.render('resetSent2');
}

function sendForgotEmail(req, res) {
  const { email } = req.body;

  models.account.findOne({
    where: {
      email,
    },
  }).then(async (account) => {
    if (account === null) {
      res.json({ errors: `No registered account with email ${email}. Please sign up or double check you have entered the correct email address` });
    } else {
      // schedule sending of email

      await queueController.addResetEmailJob(email);

      res.json({ success: 'success' });
    }
  });
}

function forgotten(res) {
  res.render('forgottenPassword2');
}

function generateOrderItems(req, res) {
  const { id } = req.body;
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
      const job = await queueController.addPurchaseCardsJob((kid === null) ? '0' : kid.classFk, basketItems);

      // need to return job
      res.json({ id: job.id });
    });
  });
}

function resetPassword(req, res) {
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
}

function getEditContactDetails(req, res) {
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
}

function updatePassword(req, res) {
  const { password } = req.body;
  const { repeat } = req.body;

  if (repeat === password) {
    if (repeat === 'welcome') {
      res.json({ errors: 'Please update to a new password' });
    } else {
      const errors = validator.validateCreateUserFields(req);

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
}

function getUpdatePassword(req, res) {
  res.render('updatePassword', { user: req.user });
}

function editContactDetails(req, res) {
  const { schoolId } = req.body;

  // validate values
  const errors = validator.validateCreateUserFields(req);

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
}

async function setToShipped(req, res) {
  const { purchaseBasketId } = req.body;

  const purchaseBasket = await models.purchaseBasket.findOne({
    where: {
      id: purchaseBasketId,
    },
  });

  if (purchaseBasket.shippedFl === true) return res.json({ error: `Order blu-${purchaseBasketId} has already been shipped` });

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
}

module.exports = {
  addArtwork,
  addPicture,
  charityAmountBackTask,
  createClass,
  editContactDetails,
  forgotten,
  getEditContactDetails,
  getKids,
  sendFailedEmails,
  sendForgotEmail,
  generateOrderItems,
  getAccounts,
  getClasses,
  getClassesWithCards,
  getCreatePrintFormJobs,
  getProductItemJob,
  getUpdatePassword,
  getUpdatePicArtworkJobs,
  getUpdatePurchaseJobs,
  reset,
  resetPassword,
  resetSent,
  searchClass,
  searchClassResults,
  searchKidsResults,
  searchSchoolsResults,
  setToShipped,
  updateCard,
  updateCardArtworkAndPicture,
  updatePassword,
  uploadArtwork,
  uploadPicture,
};
