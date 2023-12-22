const accountUtility = require('../utility/account/accountUtility');
const queueController = require('./QueueController');
const schoolUtility = require('../utility/school/schoolUtility');
const kidUtility = require('../utility/kid/kidUtility');
const classUtility = require('../utility/class/classUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');
const productItemUtility = require('../utility/product/productItemUtility');

async function linkKid(req, res) {
  const account = req.user;
  const {
    month, age, name, code,
  } = req.query;

  const isKidLinkedToAccount = await kidUtility.isKidLinkedToAccountId(account.id);
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

  res.render('linkKid3', {
    user: req.user,
    basketItemsDetails,
    isKidLinkedToAccount,
    accountLinkedByAdmin: req.query.accountId,
    name,
    age,
    month,
    code,
  });
}

async function createNewCard(req, res) {
  const { basket } = req.body;
  const job = await queueController.linkKidJob('John Doe', 5, 0, null, req.user);
  return res.json({ id: job.id, basket });
}

async function processLinkKids(req, res) {
  const account = req.user;
  let { months } = req.body;
  const { years } = req.body;
  const { name } = req.body;
  const { classCode } = req.body;
  const { basket } = req.body;

  months = (months === '') ? 0 : months;
  const classAndSchool = await classUtility.getClassAndSchoolByClassNumber(classCode);

  if (classAndSchool == null) {
    const errors = {
      code: 'The class code or school code you entered is not valid, please make sure you have entered the codes correctly',
    };
    // error
    return res.json({ errors });
  }

  const job = await queueController.linkKidJob(name, years, months, classAndSchool.classId, account);
  return res.json({ id: job.id, basket });
}

async function getAccountIdForKidNumber(req, res) {
  const { kidNumber } = req.query;

  const kid = await kidUtility.getKidByCode(kidNumber);
  const accountId = kid.parentAccountFk;

  res.json({ accountId });
}

async function getKidProductItemsScreen(req, res) {
  const { kidNumber } = req.query;

  const kid = await kidUtility.getKidByCode(kidNumber);
  const schoolClass = await classUtility.getClassById(kid.classFk);
  const school = (schoolClass == null) ? null : await schoolUtility.getSchoolFromSchoolId(schoolClass.schoolFk);
  const productItems = await productItemUtility.getProductItemsForKidNumber(kidNumber);
  const accountId = kid.parentAccountFk;
  const orders = await orderUtility.getOrdersForAccountId(accountId);
  const account = await accountUtility.getAccountById(accountId);
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('kidProductItems', {
    user: req.user,
    productItems,
    backgroundSetting,
    kid,
    school,
    schoolClass,
    schoolsRequiringGiveBackAction,
    ordersNotShipped,
    orderHistory: orders,
    account,
  });
}

async function linkKidJob(req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const result = (job.returnvalue == null) ? undefined : job.returnvalue;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, result, process,
    });
  }
}

module.exports = {
  linkKid,
  createNewCard,
  processLinkKids,
  getAccountIdForKidNumber,
  getKidProductItemsScreen,
  linkKidJob,
};
