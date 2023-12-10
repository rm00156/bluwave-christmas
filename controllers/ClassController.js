const PDFMerge = require('pdf-merge');
const aws = require('aws-sdk');
// const process.env = require('../process.env/process.env.json');
const archiver = require('archiver');

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
const hbs = require('handlebars');
const moment = require('moment');
const adminUtility = require('../utility/admin/adminUtility');
const queueController = require('./QueueController');
const orderController = require('./OrderController');
const orderUtility = require('../utility/order/orderUtility');
const schoolUtility = require('../utility/school/schoolUtility');
const kidUtility = require('../utility/kid/kidUtility');
const models = require('../models');
const classUtility = require('../utility/class/classUtility');

aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

exports.getOrderDetailsForAllKidsFromClassId = async function (classId, totalKids) {
  return await getOrderDetailsForAllKidsFromClassId(classId, totalKids);
};

async function getOrderDetailsForAllKidsFromClassId(classId, totalKids) {
  const orders = await models.sequelize.query(
    'select count(distinct pb.id) as orderCount from purchasebaskets pb '
            + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
            + ' inner join productItems pi on b.productItemFk = pi.id '
            + ' inner join classes c on pi.classFk = c.id '
            + ' where c.id = :classId '
            + ' and pb.status = :completed ',
    { replacements: { classId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );

  const details = {
    orderCount: orders[0].orderCount,
    totalKids,
  };

  return details;
}

exports.getClassScreen = async function (req, res) {
  const { classNumber } = req.query;

  const schoolClass = await schoolUtility.getClassByNumber(classNumber);
  const classId = schoolClass.id;
  const kids = await kidUtility.getKidsFromClassId(classId);
  const orderDetails = await getOrderDetailsForAllKidsFromClassId(classId, kids.length);
  const orders = await orderController.getOrdersForClassId(classId);
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminClass', {
    user: req.user,
    schoolClass,
    backgroundSetting,
    kids,
    orderDetails,
    orders,
    ordersNotShipped,
    schoolsRequiringGiveBackAction,
  });
};

exports.getClassOrderInstruction = async function (req, res) {
  const { classId } = req.query;
  const deadline = await schoolUtility.getSchoolDeadlineFromClassId(classId);

  if (deadline == null) return res.json({ error: 'No deadline has been set for the school' });

  const job = await queueController.addClassOrderInstructionJob(classId, deadline.id);
  res.json({ id: job.id });
};

exports.getSchoolOrderInstruction = async function (req, res) {
  const { schoolId } = req.query;
  const deadline = await schoolUtility.getSchoolDeadlineBySchoolId(schoolId);

  if (deadline == null) return res.json({ error: 'No deadline has been set for the school' });

  const job = await queueController.addSchoolOrderInstructionJob(schoolId);
  res.json({ id: job.id });
};

exports.processSchoolOrderInstruction = async function (schoolId, job) {
  return await processSchoolOrderInstruction(schoolId, job);
};

const processSchoolOrderInstruction = async function (schoolId, job) {
  const classes = await models.class.findAll({
    where: {
      schoolFk: schoolId,
    },
  });

  const school = await models.school.findOne({
    where: {
      id: schoolId,
    },
  });

  const deadline = await models.deadLine.findOne({
    where: {
      schoolFk: schoolId,
    },
  });

  const params = {
    Bucket: process.env.bucketName,
  };

  const s3 = new aws.S3();
  const files = [];

  let progress = 1;
  for (let i = 0; i < classes.length; i++) {
    const json = await processClassOrderInstruction(classes[i].id, deadline.id, progress, i + 1, job);

    const file = await downloadFiles(json.pdfPath, params, i, s3);
    progress = json.progress;
    files.push(file);
    console.log(progress);
  }

  progress++;
  job.progress(progress);

  const now = Date.now();

  const coverFileName = `${process.cwd()}/${await generateCoverSheetForSchoolOrderInstructions(school, classes, now)}`;
  files.unshift(coverFileName);
  const purchaseBuffer = await PDFMerge(files, { output: `${process.cwd()}/tmp/${now}_school_order_instruction.pdf` }).catch((err) => {
    console.log(err);
  });

  files.forEach((file) => {
    fs.unlink(file);
  });

  const fileName = 'SchoolOrderInstruction' + `/${school.name}${now}_school_order_instruction.pdf`;
  params.Key = fileName;
  params.ACL = 'public-read';
  params.Body = purchaseBuffer;

  const pdfPath = process.env.s3BucketPath + fileName;
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

  progress++;
  job.progress(progress);

  console.log(progress);
  const schoolOrderInstruction = await models.schoolOrderInstruction.findOne({
    where: {
      schoolFk: schoolId,
    },
  });

  if (schoolOrderInstruction == null) {
    await models.schoolOrderInstruction.create({
      schoolFk: schoolId,
      createdDttm: Date.now(),
      pdfPath,
      versionNo: 1,
      deleteFl: false,
    });
  } else {
    await models.schoolOrderInstruction.update({
      createdDttm: Date.now(),
      pdfPath,
      versionNo: models.sequelize.literal('versionNo + 1'),
    }, {
      where: {
        schoolFk: schoolId,
      },
    });
  }

  progress++;
  job.progress(progress);
  return { pdfPath, progress };
};

async function generateCoverSheetForSchoolOrderInstructions(school, classes, now) {
  const data = { school: school.name, classTotal: classes.length, numberOfKidsPerClass: school.numberOfKidsPerClass };
  const filename = `tmp/CoverOrderInstruction_${school.name}_${now}.pdf`;
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  console.log(filename);
  const page = await browser.newPage();

  const content = await compile('schoolOrderInstruction', data);
  await page.setContent(content);

  await page.pdf({
    path: filename,
    printBackground: true,
    format: 'A4',
  });

  await browser.close();

  return filename;
}

const downloadFiles = async function (filePath, params, i, s3) {
  const now = Date.now();
  const fileName = filePath.replace(process.env.s3BucketPath, '');
  params.Key = fileName;
  let file;
  const tempFile = 'tmp' + `/SchoolOrderInstruction${i}_${now}.pdf`;
  const s3DownloadPromise = new Promise((resolve, reject) => {
    file = fs.createWriteStream(tempFile);
    const stream = s3.getObject(params).createReadStream();
    stream.pipe(file);

    stream.on('finish', resolve);
  });

  await s3DownloadPromise;
  console.log(`file ${file}`);
  return `${process.cwd()}/${tempFile}`;
};

const processClassOrderInstruction = async function (classId, deadlineId, progress, classNumber, job) {
  const classOrderInstruction = await models.classOrderInstruction.findOne({
    where: {
      classFk: classId,
    },
  });

  progress++;
  job.progress(progress);

  const schoolClass = await classUtility.getClassById(classId);
  const schoolDeadline = await models.deadLine.findOne({
    where: {
      id: deadlineId,
    },
  });

  if (classOrderInstruction == null) {
    // means that no orderinstruction has been created before
    // create order instruction
    return await createOrderInstruction(schoolClass, schoolDeadline, true, progress, job);
  }

  if (classOrderInstruction.deadLineDttm.toString() == schoolDeadline.deadLineDttm.toString()) {
    // means order instruction has been created before and we would be generating the exact same copy
    progress = (5 * classNumber) + 1;
    job.progress(progress);
    console.log(progress);
    return { pdfPath: classOrderInstruction.pdfPath, progress };
  }

  return await createOrderInstruction(schoolClass, schoolDeadline, false, progress, job);
};

exports.processClassOrderInstruction = async function (classId, deadlineId, progress, classNumber, job) {
  return await processClassOrderInstruction(classId, deadlineId, progress, classNumber, job);
};

async function createOrderInstruction(schoolClass, schoolDeadline, createFl, progress, job) {
  const school = await schoolUtility.getSchoolFromSchoolId(schoolClass.schoolFk);
  const now = Date.now();

  const unparsedDeadLine = schoolDeadline.deadLineDttm;

  let month = unparsedDeadLine.getMonth() + 1;
  month = month < 10 ? `0${month}` : month;
  let days = unparsedDeadLine.getDate();
  days = days < 10 ? `0${days}` : days;
  const years = unparsedDeadLine.getFullYear();

  const deadline = `${years}-${month}-${days}`;

  const data = {
    class: schoolClass.name,
    classNumber: schoolClass.classNumber,
    school: school.name,
    schoolNumber: school.schoolNumber,
    deadline,
  };
  progress++;
  job.progress(progress);

  const filename = `tmp/OrderInstruction_${schoolClass.name}_${now}.pdf`;
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  console.log(filename);
  const page = await browser.newPage();

  const content = await compile('orderInstructions2', data);
  await page.setContent(content);
  const buffer = await page.pdf({
    path: filename,
    landscape: true,
    printBackground: true,
    format: 'A4',
  });

  await browser.close();
  progress++;
  job.progress(progress);

  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: buffer,
    Key: filename,
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

  progress++;
  job.progress(progress);
  let classOrderInstruction;
  if (createFl) {
    classOrderInstruction = await models.classOrderInstruction.create({
      classFk: schoolClass.id,
      deadLineDttm: schoolDeadline.deadLineDttm,
      createdDttm: Date.now(),
      pdfPath: process.env.s3BucketPath + filename,
      deleteFl: false,
      versionNo: 1,

    });
  } else {
    await models.classOrderInstruction.update({
      deadLineDttm: schoolDeadline.deadLineDttm,
      createdDttm: Date.now(),
      pdfPath: process.env.s3BucketPath + filename,
      versionNo: models.sequelize.literal('versionNo + 1'),
    }, {
      where: {
        classFk: schoolClass.id,
      },
    });

    classOrderInstruction = await models.classOrderInstruction.findOne({
      where: {
        classFk: schoolClass.id,
      },
    });
  }

  progress++;
  job.progress(progress);

  return { pdfPath: classOrderInstruction.pdfPath, progress };
}

exports.getCreateOrderInstructionJob = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const instructionPath = (job.returnvalue == null) ? undefined : (job.returnvalue).pdfPath;
    const { process } = job.data;
    console.log(job.returnvalue);
    res.json({
      id, state, progress, reason, instructionPath, process,
    });
  }
};

const compile = async function (templateName, data) {
  const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
  const html = await fs.readFile(filePath, 'utf-8');

  return hbs.compile(html)(data);
};

hbs.registerHelper('dateFormat', (value, format) => {
  console.log('formatting', value, format);
  return moment(value).format(format);
});

async function getOrderFormDetailsForClassId(classId) {
  const schoolClass = await classUtility.getClassById(classId);
  const school = await schoolUtility.getSchoolFromClassId(classId);

  let query = 'select distinct b.*, pv.name as productVariant, p.name as product, pb.orderNumber, pi.classFk from products p '
        + ' inner join productTypes pt on p.productTypeFk = pt.id '
        + ' inner join productVariants pv on pv.productFk = p.id '
        + ' inner join productItems pi on pi.productVariantFk = pv.id '
        + ' inner join basketItems b on b.productItemFk = pi.id '
        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
        + ' inner join classes c on pi.classFk = c.id '
        + ' where pb.status = :completed '
        + ' and pt.type = :christmasType '
        + ' and c.id = :classId '
        + ' and pb.shippingAddressFk is null ';

  const cardsFromClass = await models.sequelize.query(
    query,
    {
      replacements: { classId, completed: 'Completed', christmasType: 'Christmas Cards' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  query = 'select distinct b.*, pv.name as productVariant, p.name as product, pb.orderNumber, pi.classFk  from purchaseBaskets pb '
    + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
    + ' inner join productItems pi on b.productItemFk = pi.id  '
    + ' inner join productVariants pv on pi.productVariantFk = pv.id  '
    + ' inner join products p on pv.productFk = p.id  '
    + ' where pb.status = :completed '
    + ' and pi.classFk is null '
    + ' and pb.shippingAddressFk is null ';
  ' and pi.accountFk in ( '
    + ' select distinct b.accountFk from classes c '
    + ' inner join classes c1 on c1.schoolFk = c.schoolFk '
    + ' inner join productItems pi on pi.classFk = c1.id  '
    + ' inner join basketItems b on b.productItemFk = pi.id  '
    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id  '
    + ' inner join kids k on pi.kidFk = k.id  '
    + ' where c.id = :classId '
    + ' and pb.status = :completed)';

  const cardsNotPartOfAnyClass = await models.sequelize.query(
    query,
    {
      replacements: { classId, completed: 'Completed', christmasType: 'Christmas Cards' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  query = ' select b.*, pv.name as productVariant, p.name as product, pb.orderNumber, pi.classFk, a.name as parentName from purchaseBaskets pb '
            + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
            + ' inner join productItems pi on b.productItemFk = pi.id '
            + ' inner join productVariants pv on pi.productVariantFk = pv.id '
            + ' inner join products p on pv.productFk = p.id '
            + ' inner join accounts a on b.accountFk = a.id '
            + ' where pb.status = :completed '
            + ' and pi.kidFk is null '
            + ' and pi.classFk = :classId '
            + ' and pb.shippingAddressFk is null ';

  const calendarsLinkedToClass = await models.sequelize.query(
    query,
    {
      replacements: { classId, completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  query = 'select distinct b.*, pv.name as productVariant, p.name as product, pb.orderNumber, pi.classFk, a.name as parentName  from purchaseBaskets pb '
            + ' inner join basketItems b on b.purchaseBasketFk = pb.id  '
            + ' inner join productItems pi on b.productItemFk = pi.id '
            + ' inner join productVariants pv on pi.productVariantFk = pv.id '
            + ' inner join products p on pv.productFk = p.id '
            + ' inner join accounts a on b.accountFk = a.id '
            + ' where pb.status = :completed '
            + ' and pi.kidFk is null '
            + ' and pi.classFk is null '
            + ' and pb.shippingAddressFk is null '
            + ' and pi.accountFk in ( '
            + ' select distinct b.accountFk from products p '
            + ' inner join productTypes pt on p.productTypeFk = pt.id '
            + ' inner join productVariants pv on pv.productFk = p.id '
            + ' inner join productItems pi on pi.productVariantFk = pv.id '
            + ' inner join basketItems b on b.productItemFk = pi.id '
            + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id  '
            + ' inner join kids k on pi.kidFk = k.id '
            + ' inner join classes c on k.classFk = c.id '
            + ' where pt.type = :christmasType '
            + ' and pb.status = :completed '
            + ' and c.id = :classId)';

  const calendarsNotLinkedToClass = await models.sequelize.query(
    query,
    {
      replacements: { classId, completed: 'Completed', christmasType: 'Christmas Cards' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  const cards = [];
  const calendars = [];

  cardsFromClass.forEach((card) => {
    cards.push(card);
  });

  cardsNotPartOfAnyClass.forEach((card) => {
    cards.push(card);
  });

  calendarsLinkedToClass.forEach((calendar) => {
    calendars.push(calendar);
  });

  calendarsNotLinkedToClass.forEach((calendar) => {
    calendars.push(calendar);
  });

  return {
    cards, calendars, school, schoolClass,
  };
}

exports.generateOrdersPdf = async function (classId, job) {
  let progress = 1;
  job.progress(progress);

  const orderFormDetails = await getOrderFormDetailsForClassId(classId);
  const { cards } = orderFormDetails;
  const { calendars } = orderFormDetails;
  const { schoolClass } = orderFormDetails;
  const { school } = orderFormDetails;

  progress++;
  job.progress(progress);

  const s3 = new aws.S3();
  let params = {
    Bucket: process.env.bucketName,
  };

  let path = null;

  if (cards.length > 0) path = await downloadPurchasedFiles(cards[0], params, 0, s3);

  progress++;
  job.progress(progress);

  if (cards.length > 1) {
    var files = new Array();
    var now = Date.now();
    files = await asyncForEachDownload(cards, downloadPurchasedFiles, params, files, s3);

    path = `${process.cwd()}/tmp/${now}_purchased.pdf`;
    await PDFMerge(files, { output: path });
    files.forEach((file) => {
      fs.unlink(file);
    });
  }

  progress++;
  job.progress(progress);

  let path2 = null;

  if (calendars.length > 0) path2 = await downloadPurchasedFiles(calendars[0], params, 0, s3);

  progress++;
  job.progress(progress);

  if (calendars.length > 1) {
    var files = new Array();
    var now = Date.now();
    files = await asyncForEachDownload(calendars, downloadPurchasedFiles, params, files, s3);

    path2 = `${process.cwd()}/tmp/${now}_calendars_purchased.pdf`;

    await PDFMerge(files, { output: path2 });
    files.forEach((file) => {
      fs.unlink(file);
    });
  }

  progress++;
  job.progress(progress);

  const dir = `./tmp/${now}_purchases`;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (path != null) {
    fs.rename(path, `${dir}/cards.pdf`, (err) => {
      if (err) throw err;
    });
  }

  if (path2 != null) {
    fs.rename(path2, `${dir}/calendars.pdf`, (err) => {
      if (err) throw err;
    });
  }

  progress++;
  job.progress(progress);

  const archive = archiver('zip', { zlib: { level: 9 } });
  const fileName = `tmp/${school.name}_${schoolClass.name}_${now}purchase_result.zip`;
  const stream = fs.createWriteStream(fileName);

  const archivePromise = new Promise((resolve, reject) => {
    archive.directory(dir, false).on('error', (err) => reject(err)).pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });

  await archivePromise;

  const s3Stream = fs.createReadStream(fileName);
  params = {
    Bucket: process.env.bucketName,
    Body: s3Stream,
    Key: fileName,
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
  await stream.on('close', () => resolve());
  progress++;
  job.progress(progress);

  return { pdfPath: process.env.s3BucketPath + fileName };
};

exports.downloadPurchasedFiles = async function (purchasedFile, params, i, s3) {
  return await downloadPurchasedFiles(purchasedFile, params, i, s3);
};

const downloadPurchasedFiles = async function (purchasedFile, params, i, s3) {
  const now = Date.now();
  const cardFileName = purchasedFile.fileName;
  params.Key = cardFileName;
  let file;
  const tempFile = 'tmp' + `/Purchased_${i}_${now}.pdf`;
  const s3DownloadPromise = new Promise((resolve, reject) => {
    file = fs.createWriteStream(tempFile);
    const stream = s3.getObject(params).createReadStream();
    stream.pipe(file);

    stream.on('finish', resolve);
  });

  await s3DownloadPromise;
  return `${process.cwd()}/${tempFile}`;
};

exports.asyncForEachDownload = async function (array, callback, params, files, s3) {
  return await asyncForEachDownload(array, callback, params, files, s3);
};

const asyncForEachDownload = async function (array, callback, params, files, s3) {
  for (let i = 0; i < array.length; i++) {
    const fileName = await callback(array[i], params, i, s3);
    files.push(fileName);
  }

  return files;
};

exports.generateOrderForm = async function (req, res) {
  const { classId } = req.body;
  const orderFormDetails = await getOrderFormDetailsForClassId(classId);
  const { cards } = orderFormDetails;
  const { calendars } = orderFormDetails;

  if (cards.length == 0 && calendars.length == 0) return res.json({ error: 'No purchases to be delivered to the school have been made' });
  const job = await queueController.addOrderFormJob(classId);
  res.json({ id: job.id });
};

exports.generatePrintForm = async function (classId, job) {
  let progress = 1;
  job.progress(progress);

  const orderFormDetails = await getOrderFormDetailsForClassId(classId);
  const { cards } = orderFormDetails;
  const { calendars } = orderFormDetails;
  const { school } = orderFormDetails;
  const { schoolClass } = orderFormDetails;

  const cardsArray = new Array();
  let innerList = new Array();
  const calendarsArray = new Array();
  let calendarsInnerList = new Array();
  let calendarsCount = 0;
  let count = 0;

  let numberOfCards = cards.length;

  progress++;
  job.progress(progress);

  while (numberOfCards > 0) {
    if (count % 10 == 0 && count != 0) {
      cardsArray.push(innerList);
      innerList = new Array();
    }

    innerList.push(cards[count]);

    numberOfCards--;
    if (numberOfCards == 0) cardsArray.push(innerList);
    count++;
  }

  let numberOfCalendars = calendars.length;
  while (numberOfCalendars > 0) {
    if (calendarsCount % 10 == 0 && calendarsCount != 0) {
      calendarsArray.push(calendarsInnerList);
      calendarsInnerList = new Array();
    }

    calendarsInnerList.push(calendars[calendarsCount]);

    numberOfCalendars--;
    if (numberOfCalendars == 0) calendarsArray.push(calendarsInnerList);
    calendarsCount++;
  }

  progress++;
  job.progress(progress);

  let pageNumber = 1;
  const numberOfPages = cardsArray.length + calendarsArray.length;
  const files = new Array();
  for (var i = 0; i < cardsArray.length; i++) {
    console.log(cardsArray[i]);
    var x = await generatePrintFormPage(cardsArray[i], school, schoolClass, pageNumber, numberOfPages);
    console.log(x);
    files.push(x);
    pageNumber++;
  }

  progress++;
  job.progress(progress);

  for (var i = 0; i < calendarsArray.length; i++) {
    var x = await generateCalendarsFormPage(calendarsArray[i], school, schoolClass, pageNumber, numberOfPages);
    files.push(x);
    pageNumber++;
  }

  progress++;
  job.progress(progress);
  const now = Date.now();
  // prod upload the file use file path
  const buffer = await PDFMerge(files, { output: `${process.cwd()}/tmp/${now}_printForm.pdf` });

  files.forEach((file) => {
    fs.unlink(file);
  });

  progress++;
  job.progress(progress);

  const s3 = new aws.S3();
  const s3FileLocation = `${school.name}/${schoolClass.name}/${now}_printForm.pdf`;

  const params = {
    Bucket: process.env.bucketName,
    Body: buffer,
    Key: s3FileLocation,
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

  progress++;
  job.progress(progress);

  const s3Path = process.env.s3BucketPath + s3FileLocation;
  return s3Path;
};

async function generatePrintFormPage(array, school, schoolClass, pageNumber, numberOfPages) {
  const data = {
    className: schoolClass.name,
    schoolName: school.name,
    basketItems: array,
    pageNumber,
    numberOfPages,
  };

  return await printForm(data, pageNumber, 'printForm');
}

async function generateCalendarsFormPage(array, school, schoolClass, pageNumber, numberOfPages) {
  const data = {
    className: schoolClass.name,
    schoolName: school.name,
    basketItems: array,
    pageNumber,
    numberOfPages,
  };

  return await printForm(data, pageNumber, 'printExtrasForm');
}

const printForm = async function (data, i, template) {
  const date = Date.now();
  const filename = `tmp/reece_${date}_${i}.pdf`;
  const browser = await puppeteer.launch({
    pipe: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  const page = await browser.newPage();
  const content = await compile(template, data);
  await page.setContent(content);

  await page.pdf({
    path: filename,
    printBackground: true,
    format: 'A4',
  });

  browser.close();

  return filename;
};

exports.getPurchasedOrders = async function (req, res) {
  const { classId } = req.body;

  const orderFormDetails = await getOrderFormDetailsForClassId(classId);
  const { cards } = orderFormDetails;
  const { calendars } = orderFormDetails;

  if (cards.length == 0 && calendars.length == 0) return res.json({ error: 'No purchases have been made' });
  const job = await queueController.addPurchaseOrdersJob(classId);
  res.json({ id: job.id });
};
