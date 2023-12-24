const hbs = require('handlebars');
const logger = require('pino')();
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');
const bcrypt = require('bcrypt');
const puppeteer = require('puppeteer');
const aws = require('aws-sdk');

aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

function makeCode() {
  let result = '';
  const characters = '23456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 7; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function pauseForTimeInSecond(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

hbs.registerHelper('dateFormat', (value, format) => moment(value).format(format));

async function compile(templateName, data) {
  const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
  const html = await fs.readFile(filePath, 'utf-8');

  return hbs.compile(html)(data);
}

function generateHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

async function setUpPageAndBrowser(templateName, data) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const content = await compile(
    templateName,
    data,
  );
  await page.setContent(content);
  return { page, browser };
}

async function uploadBodyToS3Bucket(buffer, s3FileLocation) {
  const s3 = new aws.S3();
  const params = {
    Bucket: process.env.bucketName,
    Body: buffer,
    Key: s3FileLocation,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, uploadData) => {
      if (err) {
        logger.error(err);
        reject(err);
      } else {
        resolve(uploadData);
      }
    });
  });

  await s3UploadPromise;
}

async function deleteS3Folder(folderPrefix) {
  try {
    const s3 = new aws.S3();
    const params = {
      Bucket: process.env.bucketName,
      Prefix: folderPrefix,
    };
    // List all objects in the specified prefix
    const objects = await s3.listObjectsV2(params).promise();
    // Check if there are any objects to delete
    if (objects.Contents.length === 0) {
      logger.error('Folder is already empty.');
      return;
    }

    // Prepare the list of objects to be deleted
    const deleteParams = {
      Bucket: process.env.bucketName,
      Delete: { Objects: objects.Contents.map((obj) => ({ Key: obj.Key })) },
    };

    // Delete the objects
    try {
      await s3.deleteObjects(deleteParams).promise();
    } catch (err) {
      logger.error(err);
    }
  } catch (error) {
    logger.error('Error:', error.message);
  }
}

async function createPdfAsBuffer(page, width, height, browser) {
  await page.setViewport({ width: 1400, height: 800, deviceScaleFactor: 2 });
  const buffer = await page.pdf({
    printBackground: true,
    landscape: false,
    width,
    height,
  });

  await page.close();
  await browser.close();
  return buffer;
}

async function createA4PdfAsBuffer(page, filePath, landscape, browser) {
  const buffer = await page.pdf({
    path: filePath,
    landscape,
    printBackground: true,
    format: 'A4',
  });
  await page.close();
  await browser.close();
  return buffer;
}

function getParsedDttmAndTime(dttm) {
  let month = dttm.getMonth() + 1;
  month = month < 10 ? `0${month}` : month;
  let days = dttm.getDate();
  days = days < 10 ? `0${days}` : days;
  const years = dttm.getFullYear();

  let hours = dttm.getHours();
  hours = hours < 10 ? `0${hours}` : hours;
  let minutes = dttm.getMinutes();
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  let seconds = dttm.getSeconds();
  seconds = seconds < 10 ? `0${seconds}` : seconds;

  const time = `${hours}:${minutes}:${seconds}`;
  const parsedDttm = `${years}-${month}-${days}`;
  return { time, parsedDttm };
}

async function downloadFiles(fileName, i) {
  const s3 = new aws.S3();
  const now = Date.now();
  const params = { Bucket: process.env.bucketName, Key: fileName };

  let file;
  const tempFile = `tmp/Download_${i}_${now}.pdf`;
  const s3DownloadPromise = new Promise((resolve) => {
    file = fs.createWriteStream(tempFile);
    const stream = s3.getObject(params).createReadStream();
    stream.pipe(file);

    stream.on('finish', resolve);
  });

  await s3DownloadPromise;
  return `${process.cwd()}/${tempFile}`;
}

async function asyncForEachDownload(array, callback) {
  const files = [];
  for (let i = 0; i < array.length; i += 1) {
    const fileName = await callback(array[i].fileName, i);
    files.push(fileName);
  }

  return files;
}

module.exports = {
  makeCode,
  pauseForTimeInSecond,
  compile,
  generateHash,
  setUpPageAndBrowser,
  uploadBodyToS3Bucket,
  deleteS3Folder,
  createPdfAsBuffer,
  getParsedDttmAndTime,
  downloadFiles,
  asyncForEachDownload,
  createA4PdfAsBuffer,
};
