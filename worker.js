const throng = require('throng');
const Queue = require('bull');

const notProduction = process.env.NODE_ENV !== 'production';
if (notProduction) {
  require('dotenv').config();
}

const redisUrlParse = require('redis-url-parse');
const fs = require('fs-extra');

// const process.env = require('./process.env/process.env.json');
const aws = require('aws-sdk');
const puppeteer = require('puppeteer');
const PDFMerge = require('pdf-merge');
const nodeMailer = require('nodemailer');
const models = require('./models');
// Connect to a local redis intance locally, and the Heroku-provided URL in production
const REDIS_URL = /* process.env.REDIS_URL */ process.env.STACKHERO_REDIS_URL_TLS || 'redis://127.0.0.1:6379';
const env = process.env.NODE_ENV || 'development';
const urlPrefix = env === 'development' ? 'http://localhost:4000' : process.env.website;

const schoolUtility = require('./utility/school/schoolUtility');
const productItemUtility = require('./utility/product/productItemUtility');
const kidUtility = require('./utility/kid/kidUtility');
const generalUtility = require('./utility/general/generalUtility');
const {
  generateOrdersPdf, processClassOrderInstruction, getPdfsOfOrderItemsForPurchaseBasketId,
  processSchoolOrderInstruction, generatePrintForm,
} = require('./utility/order/orderUtility');

const testEmail = 'rmillermcpherson4@gmail.com';
const STATUS_TYPES = require('./utility/school/statusTypes');
// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
const workers = process.env.WEB_CONCURRENCY || 2;

// The maxium number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
const maxJobsPerWorker = 15;

const redisUrlParsed = redisUrlParse(REDIS_URL);
const { host, port, password } = redisUrlParsed;
const client = REDIS_URL.includes('rediss://')
  ? {
    redis: {
      port: Number(port),
      host,
      password,
      tls: {
        rejectUnauthorized: false,
      },
    },
  }
  : REDIS_URL;

aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

async function forEachNoResponseDeadline(schools, callback) {
  for (let i = 0; i < schools.length; i += 1) {
    await callback(schools[i]);
  }
}

async function createEmail(type, errors, accountId) {
  const status = (errors) ? 'Failed' : 'Success';
  models.emailType.findOne({
    where: {
      type,
    },
  }).then(async (emailType) => {
    await models.email.create({
      emailTypeFk: emailType.id,
      sentDttm: Date.now(),
      status,
      accountFk: accountId,
      deleteFl: false,
      versionNo: 1,
    });
  }).catch((err) => {
    console.log(err);
  });
}

async function sendDelayEmail(schoolId) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const school = await models.school.findOne({
    where: {
      id: schoolId,
    },
  });

  const account = await models.account.findOne({
    where: {
      email: school.email,
    },
  });

  const data = { name: account.name };

  const content = await generalUtility.compile('delayEmail', data);
  const mailOptions = {
    from: process.env.mailServer_email,
    to: env === 'development' ? testEmail : school.email,
    subject: 'Delay Period has now passed',
    html: content,
  };

  smtpTransport.sendMail(mailOptions, async (errors, res) => {
    console.log(errors);
    console.log(res);

    await createEmail('Delay', errors, account.id);
    if (!errors) {
      await models.deadLine.update(
        {
          emailSentFl: true,
          emailSentDttm: Date.now(),
        },
        {
          where:
        {
          schoolFk: schoolId,
        },
        },
      );
    }
  });
}

async function schoolNoResponseDeadline(school) {
  const { emailSentDttm } = school;
  console.log(emailSentDttm);
  const date = new Date(emailSentDttm);
  const window = new Date();
  window.setDate(date.getDate() + 3);

  if (window.getTime() < Date.now()) {
    // move school to next step
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.PRINTING);
    // TO-DO send email maybe to customer
    // TO-DO send email to bluwave
  }
}

async function threeDayReminder(account) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const days = '3 days';
  const data = { name: (account.name === null ? '' : account.name), days };
  const content = await generalUtility.compile('dayReminder', data);

  const mailOptions = {
    from: process.env.mailServer_email,
    to: env === 'development' ? testEmail : account.email,
    subject: '3 Days till purchase deadline',
    html: content,
  };

  smtpTransport.sendMail(mailOptions, (errors) => {
    createEmail('Parent 3 days to Deadline Reminder', errors, account.id);
    console.log(errors);
    // console.log(res);
  });
}

async function sendCharityEmail(school) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const account = await models.account.findOne({
    where: {
      email: school.email,
    },
  });

  const { name } = account;
  const confirmLink = `${urlPrefix}/login?confirmAmount=true`;
  const content = await generalUtility.compile('charityEmail', { name, confirmLink });
  const mailOptions = {
    from: process.env.mailServer_email,
    to: (env === 'development') ? testEmail : school.email,
    subject: 'Charity contribution amount',
    html: content,
  };

  smtpTransport.sendMail(mailOptions, async (errors) => {
    await createEmail('Charity', errors, account.id);
    if (!errors) {
      // TO-DO  save model detailing that email has been sent
      // create new status moving the

      await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.WAITING_FOR_CHARITABLE_CONTRIBUTION_RESPONSE);

      mailOptions.to = (env === 'development') ? testEmail : process.env.mailServer_email;

      smtpTransport.sendMail(mailOptions, async (bluwaveErrors) => {
        await createEmail('Charity Bluwave', bluwaveErrors, account.id);
      });
    }
  });

  // create new template
}

async function sendGiveBackAmountEmailToSchool(school) {
  const giveBackAmountBreakDownPerClass = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
  const { totalGiveBackAmount } = giveBackAmountBreakDownPerClass;

  await schoolUtility.createCharityAmount(school.id, totalGiveBackAmount);
  await sendCharityEmail(school);
}

async function oneDayReminder(account) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const days = '1 day';
  const data = { name: (account.name === null ? '' : account.name), days };
  const content = await generalUtility.compile('dayReminder', data);

  const mailOptions = {
    from: process.env.mailServer_email,
    to: env === 'development' ? testEmail : account.email,
    subject: '1 Day till purchase deadline',
    html: content,
  };

  smtpTransport.sendMail(mailOptions, (errors) => {
    createEmail('Parent 1 day to Deadline Reminder', errors, account.id);
    console.log(errors);
    // console.log(res);
  });
}

async function updateAndGenerate(productItemId, productId, name, age, month, displaySchool, displayClass, displayAge, job) {
  let progress = 1;
  job.progress(progress);

  const productItem = await productItemUtility.getProductItemById(productItemId);
  let productItems;
  const kidId = productItem.kidFk;
  let kid = null;
  if (kidId !== null) {
    await models.kid.update({
      name,
      age,
      month,
      versionNo: models.sequelize.literal('versionNo + 1'),
    }, {
      where: {
        id: kidId,
      },
    });

    kid = await kidUtility.getKidById(kidId);
    productItems = await productItemUtility.getProductItemsWithProductForKid(productId, kidId);
  } else {
    productItems = await productItemUtility.getProductItemsWithProductForAccountAndNotWithKid(productId, productItem.accountFk);
  }
  progress += 1;
  job.progress(progress);
  console.log('REEECE');
  for (let i = 0; i < productItems.length; i += 1) {
    const item = productItems[i];
    await models.productItem.update({
      text1: name,
      text2: age,
      text3: month,
      displayItem1: displaySchool,
      displayItem2: displayClass,
      displayItem3: displayAge,
      versionNo: models.sequelize.literal('versionNo + 1'),
    }, {
      where: {
        id: item.id,
      },
    });
  }

  progress += 1;
  job.progress(progress);

  console.log('ZITA');
  await productItemUtility.generateUpdateProductItem(kid, productId, productItem.accountFk);
  console.log('ALYSSA');

  progress += 1;
  job.progress(progress);
}

async function uploadAndGenerate(productItemId, pictureNumber, productId, files, job) {
  let progress = 1;
  job.progress(progress);

  const blob = await Buffer.from(files.blob.data);

  let fileName = await models.uploadFileName.create();
  fileName = fileName.id;

  progress += 1;
  job.progress(progress);

  const date = Date.now();
  const suffix = 'jpeg';
  const s3PicturePath = `${process.env.s3BucketPath}Pictures/${date}_${fileName}.${suffix}`;

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: blob,
    Key: `Pictures/${date}_${fileName}.${suffix}`,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await s3UploadPromise;

  progress += 1;
  job.progress(progress);

  // uploaded cropped image
  const productItem = await productItemUtility.getProductItemById(productItemId);
  const kidId = productItem.kidFk;
  const accountId = productItem.accountFk;
  const existingProductItems = await productItemUtility.getProductItemsWithProductForAccount(productId, productItem.accountFk, kidId);

  progress += 1;
  job.progress(progress);

  const data = {};
  data[`picture${pictureNumber}Path`] = s3PicturePath;

  // edit the picture for the productitem to the new value
  // existingProductItems.forEach(async existingProductItem => {
  for (let i = 0; i < existingProductItems.length; i += 1) {
    const existingProductItem = existingProductItems[i];
    await models.productItem.update(
      data,
      {
        where: {
          id: existingProductItem.id,
        },
      },
    );
  }
  // })

  progress += 1;
  job.progress(progress);

  // regenerate the productitems pdf and update the value
  const kid = await kidUtility.getKidById(kidId);
  await productItemUtility.generateUpdateProductItem(kid, productId, accountId);

  progress += 1;
  job.progress(progress);
}

async function sendNoPurchaseMadeSinceSignUp(account) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const data = { name: (account.name === null ? '' : account.name) };
  const content = await generalUtility.compile('noPurchaseSinceSignUp', data);
  const mailOptions = {
    from: process.env.mailServer_email,
    to: env === 'development' ? testEmail : account.email,
    subject: 'School Project - Buy your kids cards here',
    html: content,
  };

  smtpTransport.sendMail(mailOptions, (errors) => {
    createEmail('Noticed No Purchase After Sign Up', errors, account.id);
    console.log(errors);
  });
}

function delay(time) {
  Promise((resolve) => setTimeout(resolve, time));
}

async function forEachNoPurchaseMadeAccount(array, callback) {
  for (let i = 0; i < array.length; i += 1) {
    await callback(array[i]);
    await delay(5000);
  }
}

async function noPurchaseMadeSinceSignUp() {
  models.sequelize.query(
    'select distinct a2.* from accounts a2 '
            + ' where a2.id not in (select a.id from accounts a '
            + ' inner join basketitems b on b.accountfk = a.id '
            + ' inner join purchasebaskets pb on b.purchasebasketfk = pb.id '
            + ' where pb.status= :completed ) and a2.accountTypeFk = 2 '
            + ' and a2.id not in (select accountFk from emails where emailTypeFk = 19) ',
    { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  )
    .then(async (result) => {
      await forEachNoPurchaseMadeAccount(result, sendNoPurchaseMadeSinceSignUp);
    });
}
async function forEachDayReminder(array, callback) {
  for (let i = 0; i < array.length; i += 1) {
    await callback(array[i]);
  }
}

async function parent1DayToDeadline() {
  models.sequelize.query(
    'select distinct a2.*, d.deadLineDttm, s.name from accounts a2 '
  + ' inner join schools s on s.organiserAccountFk = a2.id '
  + ' inner join deadlines d on d.schoolFk = s.id '
  + ' where a2.id not in (select distinct e.accountFk from emails e where e.emailTypeFk = 15 and e.status= :status) '
  + ' and subdate(d.deadLineDttm , 1 ) <= current_date()   ',
    { replacements: { status: 'Success' }, type: models.sequelize.QueryTypes.SELECT },
  )
    .then(async (results) => {
      await forEachDayReminder(results, oneDayReminder);
    // console.log('result ' + result);
    });
}

async function parent3DaysToDeadline() {
  const results = await models.sequelize.query(
    'select distinct a2.*, d.deadLineDttm, s.name from accounts a2 '
      + ' inner join schools s on s.organiserAccountFk = a2.id '
      + ' inner join deadlines d on d.schoolFk = s.id '
      + ' where a2.id not in (select distinct e.accountFk from emails e where e.emailTypeFk = 15 and e.status= :status) '
      + ' and subdate(d.deadLineDttm , 3 ) <= current_date()  ',
    { replacements: { status: 'Success' }, type: models.sequelize.QueryTypes.SELECT },
  );

  await forEachDayReminder(results, threeDayReminder);
}

async function sendResetEmail(email) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });
  models.resetEmail.findOne({
    where: {
      email,
    },
  }).then(async (resetEmail) => {
    const now = Date.now();
    const hourLater = now + 60 * 60 * 1000;
    const link = `${urlPrefix}/reset?from=${now}&to=${hourLater}&email=${email}`;
    const data = { now, hourLater, link };

    const content = await generalUtility.compile('resetEmail', data);

    if (resetEmail === null) {
      models.resetEmail.create({
        fromDttm: now,
        toDttm: hourLater,
        email,
        usedFl: false,
        deleteFl: false,
        versionNo: 1,
      }).then(() => {
        const mailOptions = {
          from: process.env.mailServer_email,
          to: email,
          subject: 'Reset Password',
          html: content,
        };

        smtpTransport.sendMail(mailOptions, (errors) => {
          models.account.findOne({

            where: {
              email,
            },
          }).then((account) => {
            createEmail('Reset Password', errors, account.id);
            console.log(errors);
            // console.log(res);
          });
        });
      }).catch((err) => {
        console.log(err);
      });
    } else {
      models.resetEmail.update({
        fromDttm: now,
        toDttm: hourLater,
        usedFl: false,
        versionNo: models.sequelize.literal('versionNo + 1'),
      }, {
        where: {
          email,
        },
      }).then(() => {
        const mailOptions = {
          from: process.env.mailServer_email,
          to: email,
          subject: 'Reset Password',
          html: content,
        };

        smtpTransport.sendMail(mailOptions, (errors, res) => {
          models.account.findOne({

            where: {
              email,
            },
          }).then((account) => {
            createEmail('Reset Password', errors, account.id);
            console.log(errors);
            console.log(res);
          });
        });
      }).catch((err) => {
        console.log(err);
      });
    }
  }).catch((err) => {
    console.log(err);
  });
}

async function testTrial(x, y, width, height, name, nameX, nameY, nameHeight, nameWidth) {
  console.log(`name X  ${name}`);
  const newWidth = parseFloat(width);
  const newHeight = parseFloat(height);

  const newX = parseFloat(x);
  const newY = parseFloat(y);
  const data = {
    x: newX, y: newY, width: newWidth, height: newHeight, name, nameX, nameY, nameHeight, nameWidth,
  };
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const filename = 'tmp/reece.pdf';
  const page = await browser.newPage();

  const content = await generalUtility.compile('testTrial', data);
  await page.setContent(content);

  await page.setViewport({ width: 1400, height: 800, deviceScaleFactor: 2 });
  await page.pdf({
    path: filename,
    printBackground: true,
    landscape: false,
    width: '14.5cm',
    height: '14.5cm',
  });
  await browser.close();
}

async function test() {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const data = {};
  const content = await generalUtility.compile('delayEmail', data);
  const mailOptions = {
    from: process.env.mailServer_email,
    to: 'rmillermcpherson4@gmail.com',
    subject: ' have confirmed their charity give back amount',
    html: content,
  };

  smtpTransport.sendMail(mailOptions, (errors, res) => {
    console.log(errors);
    console.log(res);
  });
}

async function sendConfirmDetailsEmail(schoolId, name, bankAcc, sortCode, type) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const charityAmount = await models.charityAmount.findOne({
    where: {
      schoolFk: schoolId,
    },
  });

  const school = await models.school.findOne({
    where: {
      id: schoolId,
    },
  });

  const { amount } = charityAmount;
  const data = {
    amount, school: school.name, name, sortCode, bankAcc, type,
  };

  const content = await generalUtility.compile('charityConfirmEmail', data);
  const mailOptions = {
    from: process.env.mailServer_email,
    to: env === 'development' ? testEmail : process.env.mailServer_email,
    subject: `${school.name} have confirmed their charity give back amount`,
    html: content,
  };

  smtpTransport.sendMail(mailOptions, async (errors, res) => {
    const account = await models.account.findOne({
      where: {
        email: school.email,
      },
    });

    await createEmail('Confirmed Charity Amount Bluwave', errors, account.id);
    console.log(errors);
    console.log(res);
  });
}

async function noDeadlineResponse() {
  // find all schools on waiting for customer response step which have had email sent out
  // are on the deadline step continuefl is null
  // move to printing step

  const schools = await models.sequelize.query('select s.*, d.emailSentDttm from schools s '
    + ' inner join statuses st on st.schoolFk = s.id '
    + ' inner join deadlines d on d.schoolFk = s.id '
    + ' where st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc LIMIT 1) '
    + ' and st.statusTypeFk = 5 '
    + ' and d.continueFl is false '
    + ' and d.delayFl is false '
    + ' and d.emailSentFl = true ', { type: models.sequelize.QueryTypes.SELECT });

  console.log(schools);
  // for each school
  // check whether we have gone passed the 3 day window
  await forEachNoResponseDeadline(schools, schoolNoResponseDeadline);
}

async function charity() {
  const schools = await models.sequelize.query('select distinct s.*, st.createdDttm from basketitems b '
  + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
  + ' inner join productItems pi on b.productItemFk = pi.id '
  + ' inner join classes c on pi.classFk = c.id '
  + ' inner join schools s on c.schoolFk = s.id '
  + ' inner join statuses st on st.schoolFk = s.id '
  + ' where pb.status = :completed '
  + ' and st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc LIMIT 1) '
  + ' and st.statusTypeFk = 9', { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT });

  if (schools.length > 0) {
    console.log(schools);

    for (let i = 0; i < schools.length; i += 1) {
      const school = schools[i];

      await sendGiveBackAmountEmailToSchool(school);
    }
  }
}

async function delayRecurringTask() {
  const schools = await models.sequelize.query('select s.* from schools s '
                  + ' inner join deadlines d on d.schoolFk = s.id ', { type: models.sequelize.QueryTypes.SELECT });

  for (let i = 0; i < schools.length; i += 1) {
    const school = schools[i];

    let status = await models.sequelize.query('select s.*, concat(date(s.createdDttm), :beforeMidnight) as createdDttm from statuses s '
                                  + ' inner join schools sch on s.schoolFk = sch.id '
                                  + ' where sch.id = :schoolId '
                                  + ' order by s.createdDttm  desc LIMIT 1', {
      replacements: { schoolId: school.id, beforeMidnight: ' 23:59:59' },
      type: models.sequelize.QueryTypes.SELECT,
    });

    status = status[0];

    if (status.statusTypeFk === 6) {
      // current step is delay
      const delayDttm = new Date(status.createdDttm);
      const window = new Date();
      window.setDate(delayDttm.getDate() + 3);

      if (window.getTime() < Date.now()) {
        await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.PRINTING);
        await sendDelayEmail(school.id);
      }
    }
  }
}

async function sendDeadlineEmail(schoolId) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const school = await models.school.findOne({
    where: {
      id: schoolId,
    },
  });

  const account = await models.account.findOne({
    where: {
      email: school.email,
    },
  });

  const deadline = await models.deadLine.findOne({
    where: {
      schoolFk: schoolId,
    },
  });

  console.log(deadline);

  const data = {
    continueLink: `${urlPrefix}/continue?verificationCode=${deadline.verificationCode}`,
    delayLink: `${urlPrefix}/delay?verificationCode=${deadline.verificationCode}`,
    name: account.name,
  };

  const content = await generalUtility.compile('deadlineEmail', data);
  const mailOptions = {
    from: process.env.mailServer_email,
    to: env === 'development' ? testEmail : school.email,
    subject: 'Purchase Deadline has now passed',
    html: content,

  };

  smtpTransport.sendMail(mailOptions, async (errors, res) => {
    await createEmail('Deadline', errors, account.id);

    if (!errors) {
      await models.deadLine.update(
        {
          emailSentFl: true,
          emailSentDttm: Date.now(),
          versionNo: models.sequelize.literal('versionNo + 1'),
        },
        {
          where: {
            schoolFk: schoolId,
          },
        },
      );
    }

    console.log(errors);
    console.log(res);
  });
}

async function deadlineRecurringTask() {
  const deadlines = await models.sequelize.query('select d.* from deadlines d '
              + ' inner join schools s on d.schoolFk = s.id '
              + ' where d.emailSentFl = false '
              + ' and concat(date(d.deadLineDttm ), :beforeMidnight)< now() '
              + ' and d.continueFl = false '
              + ' and d.delayFl = false ', { replacements: { beforeMidnight: ' 23:59:59' }, type: models.sequelize.QueryTypes.SELECT }).catch((err) => {
    console.log(err);
  });

  for (let i = 0; i < deadlines.length; i += 1) {
    const deadline = deadlines[i];

    const schoolId = deadline.schoolFk;

    // if no purchase deadline step, create one else just create waiting step

    const purchaseDeadlineStatus = await schoolUtility.getSchoolStatusByStatusTypeId(schoolId, STATUS_TYPES.STATUS_TYPES_ID.PURCHASE_DEADLINE);

    if (purchaseDeadlineStatus === null) {
      await schoolUtility.createNewStatusForSchoolId(schoolId, STATUS_TYPES.STATUS_TYPES_ID.PURCHASE_DEADLINE);
    }

    await schoolUtility.createNewStatusForSchoolId(schoolId, STATUS_TYPES.STATUS_TYPES_ID.WAITING_FOR_CUSTOMER_RESPONSE);
    await sendDeadlineEmail(schoolId);
  }
}

async function sendPurchaseEmail(bluwave, basketItems, orderNumber, date, total, time) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const basketItem = basketItems[0];
  const parentAccount = await models.account.findOne({
    where: {
      id: basketItem.accountFk,
    },
  });

  let template = 'purchaseIndividual';

  const purchaseBasket = await models.purchaseBasket.findOne({
    where: {
      orderNumber,
    },
  });
  const { deliveryName } = purchaseBasket;
  const { deliveryPrice } = purchaseBasket;

  if (deliveryName === 'Collect From School') {
    template = 'purchaseEmail';

    const school = await schoolUtility.getSchoolFromBasketItemId(basketItem.basketItemId);

    const { postCode } = school;

    const data = {
      total,
      basketItems,
      date,
      time,
      orderNumber,
      school: school.name,
      postCode,
      parentAccount,
      email: parentAccount.email,
      phone: parentAccount.telephoneNumber,
    };

    const content = await generalUtility.compile(template, data);
    const mailOptions = {
      from: process.env.mailServer_email,
      to: bluwave ? process.env.mailServer_email : basketItems[0].email,
      subject: 'Thanks for making a purchase',
      html: content,
    };

    smtpTransport.sendMail(mailOptions, (errors) => {
      console.log('BIg guns');
      createEmail((bluwave) ? 'Parent Purchase Bluwave' : 'Parent Purchase', errors, parentAccount.id);
      console.log(errors);
      // console.log(res);
      // job.progress(100);
    });
  } else {
    const { school } = basketItem;
    let missedDeadline = false;
    if (school !== 'Individuals') missedDeadline = true;

    const shippingAddress = await models.shippingAddress.findOne({
      where: {
        id: purchaseBasket.shippingAddressFk,
      },
    });

    const country = await models.country.findOne({
      where: {
        id: shippingAddress.countryFk,
      },
    });

    const data = {
      orderNumber,
      date,
      basketItems,
      total,
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2,
      city: shippingAddress.city,
      postCode: shippingAddress.postCode,
      fullName: shippingAddress.fullName,
      email: parentAccount.email,
      accountName: parentAccount.name,
      time,
      country: country.name,
      deliveryCost: (parseFloat(deliveryPrice)).toFixed(2),
      deliveryType: deliveryName,
      missedDeadline,
      school,
    };

    const content = await generalUtility.compile(template, data);

    // var attachmentPath = await orderController.getOrderDetailsGroupByTypeForId(purchaseBasket.id, job);
    // console.log(attachmentPath.pdfPath)
    const mailOptions = {
      from: process.env.mailServer_email,
      to: bluwave ? process.env.mailServer_email : basketItems[0].email,
      subject: 'Thanks for making a purchase',
      html: content,
    };
    // if(bluwave === true)
    // {
    //   mailOptions['attachments'] = [{
    //     path:attachmentPath.pdfPath,
    //     filename:purchaseBasket.orderNumber + '.zip'
    //   }];
    // }

    smtpTransport.sendMail(mailOptions, (errors) => {
      createEmail((bluwave) ? 'Individual Purchase' : 'Individual Purchase Bluwave', errors, parentAccount.id);
      console.log(errors);
      // console.log(res);
      // job.progress(100);
    });
  }
}

function sendOrganiserRegistrationEmailToBluwave(school, name, account, numberOfClasses, job) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const mailOptions = {
    from: process.env.mailServer_email,
    to: env === 'development' ? testEmail : process.env.mailServer_email,
    subject: `Organiser ${name} has registered school ${school.name}`,
    html: '<p>'
  + `School/Nursery Name: ${school.name}<br>`
  + `School/Nursery Address: ${school.address}<br>`
  + `School/Nursery Post Code: ${school.postCode}<br><br>`
  + `Name: ${name}<br>`
  + `Email: <a href="${school.email}">${school.email}</a><br>`
  + `Telephone: ${school.number}<br>`
  + `Additional Information: ${school.additionalInfo === null ? '' : school.additionalInfo}<br><br>`
  + `Pupils Per Class: ${school.numberOfKidsPerClass}<br>`
  + `Number Of Classes: ${numberOfClasses}<br><br>`
  + `Date: ${account.createdAt}<br><br></p>`
  + '<p>Kids Christmas Cards at Bluwave</p><br>'
  + '<p>T 020 7277 7663</p>'
  + '<p>Bluwave Ltd<br>Unit 1b, 1a Philip Walk<br>London SE15 3NH</p><br>'
  + '<p>DISCLAIMER<br>This e-mail message, including any attachments, is intended solely for the use of the addressee and may contain confidential and legally privileged information. If you have received this email in error and it is not intended for you, please inform the sender and delete the e-mail and any attachments immediately. NOTE: Regardless of content, this e-mail shall not operate to bind Bluwave Ltd to any order or other contract unless pursuant to explicit written agreement or government initiative expressly permitting the use of e-mail for such purpose. Whilst we take reasonable precautions to ensure that our emails are free from viruses, we cannot be responsible for any viruses transmitted with this e-mail and recommend that you subject any incoming e-mail to your own virus checking procedures.</p><br><br>'
  + '<p>Bluwave Ltd, Registered in England and Wales (registered no. 048 400 51) Registered Office: Unit 1b 1a Philip Walk SE15 3NH, United Kingdom.</p><br>'
  + '<p>Website: <a href="www.thebluwavegroup.com">www.thebluwavegroup.com</a></p>',
  };
  smtpTransport.sendMail(mailOptions, (errors, res) => {
    createEmail('Organiser Registration Bluwave', errors, account.id);
    console.log(errors);
    console.log(res);
    job.progress(100);
  });
}

const sendOrganiserRegistrationEmail = async function (email, school, name, job) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const data = { schoolName: school.name, name };
  const content = await generalUtility.compile('registerOrganiser', data);
  const mailOptions = {
    from: process.env.mailServer_email,
    to: env === 'development' ? testEmail : email,
    subject: 'Welcome to Kidscards4christmas fundraising project',
    html: content,
  };

  smtpTransport.sendMail(mailOptions, (errors, res) => {
    models.account.findOne({
      where: {
        email,
      },
    }).then((account) => {
      createEmail('Organiser Registration', errors, account.id);

      console.log(errors);
      console.log(res);
      job.progress(100);
    });
  });
};

function sendParentRegistrationEmailToBluwave(email, name, telephoneNo, job) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  const accountType = 'Parent ';
  const emailType = 'Parent Registration Bluwave';
  const mailOptions = {
    from: process.env.mailServer_email,
    to: process.env.mailServer_email,
    subject: `${accountType + name} has registered`,
    html: `<p>New ${accountType} registration</p>`
    + `<p>Parent name: ${name}</p>`
    + `<p>Tel: ${telephoneNo}</p>`
    + `<p>Email: ${email}</p>`
    + '<p>Kids Christmas Cards at Bluwave</p><br>'
    + '<p>T 020 7277 7663</p>'
    + '<p>Bluwave Ltd<br>Unit 1b, 1a Philip Walk<br>London SE15 3NH</p><br>'
    + '<p>DISCLAIMER<br>This e-mail message, including any attachments, is intended solely for the use of the addressee and may contain confidential and legally privileged information. If you have received this email in error and it is not intended for you, please inform the sender and delete the e-mail and any attachments immediately. NOTE: Regardless of content, this e-mail shall not operate to bind Bluwave Ltd to any order or other contract unless pursuant to explicit written agreement or government initiative expressly permitting the use of e-mail for such purpose. Whilst we take reasonable precautions to ensure that our emails are free from viruses, we cannot be responsible for any viruses transmitted with this e-mail and recommend that you subject any incoming e-mail to your own virus checking procedures.</p><br><br>'
    + '<p>Bluwave Ltd, Registered in England and Wales (registered no. 048 400 51) Registered Office: Unit 1b 1a Philip Walk SE15 3NH, United Kingdom.</p><br>'
    + '<p>Website: <a href="www.thebluwavegroup.com">www.thebluwavegroup.com</a></p>',
  };
  smtpTransport.sendMail(mailOptions, (errors, res) => {
    models.account.findOne({
      where: {
        email,
      },
    }).then((account) => {
      createEmail(emailType, errors, account.id);
      console.log(errors);
      console.log(res);
      job.progress(100);
    });
  });
}

async function sendParentRegistrationEmail(email, job) {
  const smtpTransport = nodeMailer.createTransport({
    host: process.env.mailServer_host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.mailServer_email,
      pass: process.env.mailServer_password,
    },
  });

  models.account.findOne({
    where: {
      email,
    },
  }).then(async (account) => {
    const accountType = account.accountTypeFk;
    let template;
    let emailType;
    if (accountType === 2) {
      template = 'registerParent';
      emailType = 'Parent Registration';
    } else {
      template = 'registerIndividualParent';
      emailType = 'Individual Registration';
    }

    const content = await generalUtility.compile(template, {});
    const mailOptions = {
      from: process.env.mailServer_email,
      to: email,
      subject: 'Thank you for registering',
      html: content,
    };

    smtpTransport.sendMail(mailOptions, async (errors) => {
    // console.log(res);

      createEmail(emailType, errors, account.id);

      job.progress(100);
    });
  });
}

async function generatePurchasedCards(purchasedBasketItems, classId, job) {
  let processed = 1;
  job.progress(processed);
  processed += 1;
  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
  };

  if (purchasedBasketItems.length > 1) {
    const now = Date.now();
    const files = await generalUtility.asyncForEachDownload(purchasedBasketItems, generalUtility.downloadFiles);
    job.progress(processed);
    processed += 1;

    const purchaseBuffer = await PDFMerge(files, { output: `${process.cwd()}/tmp/${now}_purchased.pdf` });
    files.forEach((file) => {
      fs.unlink(file);
    });
    job.progress(processed);
    processed += 1;

    return models.class.findOne({
      where: {
        id: classId,
      },
    }).then(async (schoolClass) => {
      params.Key = `Purchased/${schoolClass === null ? 'undefined' : schoolClass.name}${now}_purchased.pdf`;
      params.ACL = 'public-read';
      params.Body = purchaseBuffer;

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
      job.progress(processed);
      processed += 1;
      fs.unlink(`${process.cwd()}/tmp/${now}_purchased.pdf`);

      const path = process.env.s3BucketPath + params.Key;
      return models.class.update(
        { cardsPath: path },
        {
          where: {
            id: classId,
          },
        },
      ).then(() => {
        job.progress(processed);

        return path;
      });
    });
  }

  const purchasedBasketItem = purchasedBasketItems[0];
  const cardPath = purchasedBasketItem.path;
  job.progress(4);
  return models.class.update(
    { cardsPath: cardPath },
    {
      where: {
        id: classId,
      },
    },
  ).then(() => {
    job.progress(5);

    return cardPath;
  });
}

async function sendOrdersNotShippedReminder() {
  const orderNumbers = await models.sequelize.query('select pb.orderNumber from purchasebaskets pb '
        + ' inner join shippingAddresses sa on pb.shippingAddressFk = sa.id where pb.status = :completed '
        + ' and pb.shippedFl is false ', { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT });

  console.log(orderNumbers);
  if (orderNumbers.length > 0) {
    const smtpTransport = nodeMailer.createTransport({
      host: process.env.mailServer_host,
      port: 587,
      secure: false,
      auth: {
        user: process.env.mailServer_email,
        pass: process.env.mailServer_password,
      },
    });

    const content = await generalUtility.compile('ordersToBeShippedReminder', { orderNumbers });
    const mailOptions = {
      from: process.env.mailServer_email,
      to: env === 'development' ? testEmail : process.env.mailServer_email,
      subject: 'REMINDER OF ORDERS TO BE SHIPPED',
      html: content,
    };

    smtpTransport.sendMail(mailOptions, async (errors) => {
      createEmail('Orders Not Shipped Reminder', errors, 1);
      console.log(errors);
    });
  }
}

async function sendSchoolArtworkPacksNotSentReminder() {
  const schools = await models.sequelize.query(
    'select distinct s.* from schools s '
        + ' inner join statuses st on st.schoolFk = s.id '
        + ' inner join statusTypes stt on st.statusTypeFk = stt.id '
        + ' where not exists  (select st2.statusTypeFk from statuses st2 where st2.schoolFk = s.id and st2.statusTypeFk = 3)',
    { type: models.sequelize.QueryTypes.SELECT },
  );

  console.log(schools);
  if (schools.length > 0) {
    const smtpTransport = nodeMailer.createTransport({
      host: process.env.mailServer_host,
      port: 587,
      secure: false,
      auth: {
        user: process.env.mailServer_email,
        pass: process.env.mailServer_password,
      },
    });

    const content = await generalUtility.compile('schoolArtworkPacksNotSentReminder', { schools });
    const mailOptions = {
      from: process.env.mailServer_email,
      to: env === 'development' ? testEmail : process.env.mailServer_email,
      subject: 'REMINDER OF SCHOOLS ARTWORK PACK NOT SENT OUT',
      html: content,
    };

    smtpTransport.sendMail(mailOptions, async (errors) => {
      createEmail('Artwork Pack Not Sent Reminder', errors, 1);
      console.log(errors);
    });
  }
}

async function sendSchoolReadyForPrintingReminder() {
  const schools = await models.sequelize.query(
    'select s.* from schools s '
  + ' inner join statuses st on st.schoolFk = s.id '
  + ' inner join statusTypes stt on st.statusTypeFk = stt.id '
  + ' where stt.id  = (select statusTypeFk from statuses where schoolFk = s.id order by createdDttm desc limit 1 ) '
  + ' and stt.type = :printing ',
    { replacements: { printing: 'Printing' }, type: models.sequelize.QueryTypes.SELECT },
  );

  console.log(schools);
  if (schools.length > 0) {
    const smtpTransport = nodeMailer.createTransport({
      host: process.env.mailServer_host,
      port: 587,
      secure: false,
      auth: {
        user: process.env.mailServer_email,
        pass: process.env.mailServer_password,
      },
    });

    const content = await generalUtility.compile('schoolPrintingSentReminder', { schools });
    const mailOptions = {
      from: process.env.mailServer_email,
      to: env === 'development' ? testEmail : process.env.mailServer_email,
      subject: 'REMINDER OF SCHOOLS READY TO PRINT',
      html: content,
    };

    smtpTransport.sendMail(mailOptions, async (errors) => {
      createEmail('Printing Reminder', errors, 1);
      console.log(errors);
    });
  }
}

async function sendCharityAmountConfirmedSendToSchoolReminder() {
  const schools = await schoolUtility.getSchoolsRequiringGiveBackAction();
  if (schools.length > 0) {
    const smtpTransport = nodeMailer.createTransport({
      host: process.env.mailServer_host,
      port: 587,
      secure: false,
      auth: {
        user: process.env.mailServer_email,
        pass: process.env.mailServer_password,
      },
    });

    const content = await generalUtility.compile('charityAmountConfirmedSendToSchoolReminder', { schools });
    const mailOptions = {
      from: process.env.mailServer_email,
      to: env === 'development' ? testEmail : process.env.mailServer_email,
      subject: 'REMINDER OF SCHOOLS TO SEND FUNDRAISING AMOUNT TO',
      html: content,
    };

    smtpTransport.sendMail(mailOptions, async (errors) => {
      createEmail('Charity Amount Confirmed Reminder', errors, 1);
      console.log(errors);
    });
  }
}

function start() {
  // Connect to the named work queue

  const workerQueue = new Queue('worker', client);

  workerQueue.process(maxJobsPerWorker, async (job) => {
    if (job.data.process === 'form') {
      const form = await generatePrintForm(job.data.classId, job.data.purchasedCardDetails, job.data.numberOfPurchasedItems, job.data.purchasedExtras, job);
      return { form };
    } if (job.data.process === 'purchasedCards') {
      const path = await generatePurchasedCards(job.data.purchasedBasketItems, job.data.classId, job);
      return { path };
    } if (job.data.process === 'parentRegistrationEmail') {
      return sendParentRegistrationEmail(job.data.email, job);
    } if (job.data.process === 'organiserRegistrationEmail') {
      return sendOrganiserRegistrationEmail(job.data.email, job.data.school, job.data.name, job);
    } if (job.data.process === 'parentRegistrationEmailToBluwave') {
      return sendParentRegistrationEmailToBluwave(job.data.email, job.data.name, job.data.telephoneNo, job);
    } if (job.data.process === 'organiserRegistrationEmailToBluwave') {
      console.log('reece');
      return sendOrganiserRegistrationEmailToBluwave(job.data.school, job.data.name, job.data.account, job.data.numberOfClasses, job);
    } if (job.data.process === 'purchaseEmail' || job.data.process === 'purchaseEmailToBluwave') {
      if (job.data.process === 'purchaseEmail') return sendPurchaseEmail(false, job.data.basketItems, job.data.orderNumber, job.data.date, job.data.total, job.data.time, job);
      return sendPurchaseEmail(true, job.data.basketItems, job.data.orderNumber, job.data.date, job.data.total, job.data.time, job);
    } if (job.data.process === 'deadline') {
      return deadlineRecurringTask();
    } if (job.data.process === 'delay') {
      return delayRecurringTask();
    } if (job.data.process === 'charity') {
      return charity();
    } if (job.data.process === 'noDeadlineResponse') {
      return noDeadlineResponse();
    } if (job.data.process === 'sendConfirmDetailsEmail') {
      return sendConfirmDetailsEmail(job.data.school, job.data.name, job.data.bankAcc, job.data.sortCode, job.data.type);
    } if (job.data.process === 'resetEmail') {
      return sendResetEmail(job.data.email, job);
    } if (job.data.process === 'parent3DaysToDeadline') {
      return parent3DaysToDeadline();
    } if (job.data.process === 'parent1DayToDeadline') {
      return parent1DayToDeadline();
    } if (job.data.process === 'noPurchaseMadeSinceSignUp') {
      return noPurchaseMadeSinceSignUp();
    } if (job.data.process === 'test') {
      return test();
    } if (job.data.process === 'testTrial') {
      return testTrial(
        job.data.x,
        job.data.y,
        job.data.width,
        job.data.height,
        job.data.name,
        job.data.nameX,
        job.data.nameY,
        job.data.nameHeight,
        job.data.nameWidth,
      );
    } if (job.data.process === 'uploadAndGenerate') {
      return uploadAndGenerate(job.data.productItemId, job.data.pictureNumber, job.data.productId, job.data.files, job);
    } if (job.data.process === 'updateAndGenerate') {
      return updateAndGenerate(
        job.data.productItemId,
        job.data.productId,
        job.data.name,
        job.data.age,
        job.data.month,
        job.data.displaySchool,
        job.data.displayClass,
        job.data.displayAge,
        job,
      );
    } if (job.data.process === 'generateProductItemForKid') {
      return productItemUtility.generateProductItemForKid(job.data.kid, job.data.productId, job.data.dummy, job.data.isAccountLinkedToASchoolInScheme);
    } if (job.data.process === 'classOrderInstruction') {
      return processClassOrderInstruction(job.data.classId, job.data.deadlineId, job);
    } if (job.data.process === 'schoolOrderInstruction') {
      return processSchoolOrderInstruction(job.data.schoolId, job);
    } if (job.data.process === 'ordersForm') {
      return generatePrintForm(job.data.classId, job);
    } if (job.data.process === 'purchasedOrders') {
      return generateOrdersPdf(job.data.classId, job);
    } if (job.data.process === 'generateOrderDetails') {
      return getPdfsOfOrderItemsForPurchaseBasketId(job.data.purchaseBasketId, job);
    } if (job.data.process === 'linkKid') {
      return productItemUtility.handleLinkKid(job.data.name, job.data.years, job.data.months, job.data.classId, job.data.account, job);
    } if (job.data.process === 'ordersNotShippedReminder') {
      return sendOrdersNotShippedReminder();
    } if (job.data.process === 'schoolArtworkPacksNotSentReminder') {
      return sendSchoolArtworkPacksNotSentReminder();
    } if (job.data.process === 'schoolReadyForPrintingReminder') {
      return sendSchoolReadyForPrintingReminder();
    } if (job.data.process === 'charityAmountConfirmed') {
      return sendCharityAmountConfirmedSendToSchoolReminder();
    }
    return 'error';
  });
}

// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ workers, start });
