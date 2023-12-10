const hbs = require('handlebars');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');

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

module.exports = {
  makeCode,
  pauseForTimeInSecond,
  compile,
  generateHash
};
