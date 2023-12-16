const hbs = require('handlebars');
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

hbs.registerHelper('dateFormat', (value, format) => {
  console.log('formatting', value, format);
  return moment(value).format(format);
});

async function compile(templateName, data) {
  const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
  const html = await fs.readFile(filePath, 'utf-8');

  return hbs.compile(html)(data);
}

function generateHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

async function setUpPageAndBrowser(productVariantItem, data) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const content = await compile(
    productVariantItem.templateName,
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
        console.log(err);
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
      Prefix: folderPrefix 
    };
    // List all objects in the specified prefix
    const objects = await s3.listObjectsV2(params).promise();
    // console.log(objects)
    // Check if there are any objects to delete
    if (objects.Contents.length === 0) {
      console.log('Folder is already empty.');
      return;
    }

    // Prepare the list of objects to be deleted
    const deleteParams = {
      Bucket: process.env.bucketName,
      Delete: { Objects: objects.Contents.map(obj => ({ Key: obj.Key })) },
    };

    // Delete the objects
    try {
      await s3.deleteObjects(deleteParams).promise();

    } catch(err) {
      console.log(err);
    }

    console.log('Successfully deleted folder and its contents.');
  } catch (error) {
    console.log('Error:', error.message);
  }
}

module.exports = {
  makeCode,
  pauseForTimeInSecond,
  compile,
  generateHash,
  setUpPageAndBrowser,
  uploadBodyToS3Bucket,
  deleteS3Folder
};
