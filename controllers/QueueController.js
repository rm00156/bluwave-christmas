const Queue = require('bull');

const REDIS_URL = /* process.env.REDIS_URL */ process.env.STACKHERO_REDIS_URL_TLS || 'redis://127.0.0.1:6379';

const redisUrlParse = require('redis-url-parse');

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
const workerQueue = new Queue('worker', client);

async function addClassOrderInstructionJob(classId, deadlineId) {
  return workerQueue.add({ process: 'classOrderInstruction', classId, deadlineId });
}

async function addSchoolOrderInstructionJob(schoolId) {
  return workerQueue.add({ process: 'schoolOrderInstruction', schoolId });
}

async function getJobId(id) {
  return workerQueue.getJob(id);
}

async function addJob(process) {
  return workerQueue.add({ process });
}

async function addPurchaseEmailJob(process, basketItems, orderNumber, date, total, time) {
  return workerQueue.add({
    process, basketItems, orderNumber, date, total, time,
  });
}

async function addFormJob(classId, purchasedCardDetails, numberOfPurchasedItems, purchasedExtras) {
  return workerQueue.add({
    process: 'form',
    classId,
    purchasedCardDetails,
    numberOfPurchasedItems,
    purchasedExtras,
  });
}

async function addCreateClassJob(classId) {
  return workerQueue.add({ classId, process: 'createCards' });
}

async function addUpdateCardJob(classFk, kidId, age, name, displaySchool, displayClass, displayAge, files) {
  return workerQueue.add({
    process: 'updateCard',
    classFk,
    kidId,
    age,
    name,
    displaySchool,
    displayClass,
    displayAge,
    files,
  });
}

async function updateCalendarJob(kidId, calendarId) {
  return workerQueue.add({ process: 'updateCalendar', kidId, calendarId });
}

async function updateProductItemJob(productItemId) {
  return workerQueue.add({ process: 'updateProductItem', productItemId });
}

async function addArtworkPicJob(kidId, name, age, displaySchool, month, displayClass, displayAge, file) {
  return workerQueue.add({
    process: 'artworkPic',
    kidId,
    name,
    age,
    displaySchool,
    month,
    displayClass,
    displayAge,
    file,
  });
}

async function addCreateCardAminJob(kidId) {
  return workerQueue.add({ process: 'createCardAdmin', kidId });
}

async function addResetEmailJob(email) {
  await workerQueue.add({ process: 'resetEmail', email });
}

async function addPurchaseCardsJob(classId, purchasedBasketItems) {
  return workerQueue.add({ process: 'purchasedCards', classId, purchasedBasketItems });
}

async function addSendConfirmationDetailEmailJob(school, name, bankAcc, sortCode, type) {
  await workerQueue.add({
    process: 'sendConfirmDetailsEmail',
    school,
    name,
    bankAcc,
    sortCode,
    type,
  });
}

async function addProofJob(kids, classId, year, className, schoolName) {
  return workerQueue.add({
    process: 'proof',
    kids,
    classId,
    year,
    className,
    schoolName,
    samplePath: undefined,
  });
}

async function addUploadAndGenerateJob(productItemId, pictureNumber, productId, files) {
  return workerQueue.add({
    process: 'uploadAndGenerate',
    productItemId,
    pictureNumber,
    productId,
    files,
  });
}

async function addUpdateAndGenerateJob(
  productItemId,
  productId,
  name,
  age,
  month,
  displaySchool,
  displayClass,
  displayAge,
) {
  return workerQueue.add({
    process: 'updateAndGenerate',
    productItemId,
    productId,
    name,
    age,
    month,
    displaySchool,
    displayClass,
    displayAge,
  });
}

async function addParentRegistrationEmailJob(email) {
  await workerQueue.add({ process: 'parentRegistrationEmail', email });
}

async function addParentRegistrationBluwaveEmailJob(email, telephoneNo, name) {
  await workerQueue.add({
    process: 'parentRegistrationEmailToBluwave', email, telephoneNo, name,
  });
}

async function addOrganiserRegistrationEmailJob(email, school, name) {
  await workerQueue.add({
    process: 'organiserRegistrationEmail', email, school, name,
  });
}

async function addOrganiserRegistrationBluwaveEmailJob(school, account, name, numberOfClasses) {
  await workerQueue.add({
    process: 'organiserRegistrationEmailToBluwave', school, account, name, numberOfClasses,
  });
}

async function addOrderFormJob(classId) {
  return workerQueue.add({ process: 'ordersForm', classId });
}

async function addPurchaseOrdersJob(classId) {
  return workerQueue.add({ process: 'purchasedOrders', classId });
}

async function generateOrderDetailsJob(purchaseBasketId) {
  return workerQueue.add({ process: 'generateOrderDetails', purchaseBasketId });
}

async function linkKidJob(name, years, months, classId, account) {
  return workerQueue.add({
    process: 'linkKid', name, years, months, classId, account,
  });
}

module.exports = {
  addClassOrderInstructionJob,
  addSchoolOrderInstructionJob,
  getJobId,
  addJob,
  addFormJob,
  addPurchaseEmailJob,
  addCreateClassJob,
  addUpdateCardJob,
  updateCalendarJob,
  updateProductItemJob,
  addArtworkPicJob,
  addCreateCardAminJob,
  addResetEmailJob,
  addPurchaseCardsJob,
  addSendConfirmationDetailEmailJob,
  addProofJob,
  addUploadAndGenerateJob,
  addUpdateAndGenerateJob,
  addParentRegistrationEmailJob,
  addParentRegistrationBluwaveEmailJob,
  addOrganiserRegistrationEmailJob,
  addOrganiserRegistrationBluwaveEmailJob,
  addOrderFormJob,
  addPurchaseOrdersJob,
  generateOrderDetailsJob,
  linkKidJob,
};
