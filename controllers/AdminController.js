const accountUtility = require('../utility/account/accountUtility');
const schoolUtility = require('../utility/school/schoolUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');
const productUtility = require('../utility/product/productUtility');
const productItemUtility = require('../utility/product/productItemUtility');
const kidUtility = require('../utility/kid/kidUtility');
const classUtility = require('../utility/class/classUtility');

async function getAdminDashboardPage(req, res) {
  const orderDetails = await orderUtility.getTotalOrderDetails();
  const numberOfCustomers = await accountUtility.getNumberOfCustomers();
  const giveBackDetails = await schoolUtility.getGiveBackAmount();
  const numberOfSchools = await schoolUtility.getNumberOfSchools();
  const schoolDashboardStatus = await schoolUtility.getSchoolDashboardStatus();
  const schoolProgressDetails = await schoolUtility.getSchoolProgressDetails();
  const topFivePerformingProductVariants = await orderUtility.getTopFivePerformingProductVariants();
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const numberOfLinkedKids = await kidUtility.getNumberOfLinkedKids();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();
  const subTotalToday = await orderUtility.getSubTotalOfAllOrdersToday();
  const averageTimeFromSignUpToPurchaseInMinutes = await orderUtility.getAverageTimeFromSignUpToPurchaseInMinutes();
  const numberOfSignUpsToday = await accountUtility.getNumberOfSignUpsToday();
  const numberOfOrdersToday = await orderUtility.getNumberOfOrdersToday();

  res.render('adminDashboard', {
    user: req.user,
    numberOfCustomers,
    schoolDashboardStatus,
    orderDetails,
    giveBackDetails,
    numberOfSchools,
    backgroundSetting,
    schoolProgressDetails,
    topFivePerformingProductVariants,
    subTotalToday,
    ordersNotShipped: notShippedOrders,
    averageTimeFromSignUpToPurchaseInMinutes,
    numberOfLinkedKids,
    schoolsRequiringGiveBackAction,
    numberOfSignUpsToday,
    numberOfOrdersToday,
  });
}

async function getAdminAccountPage(req, res) {
  const accountTypes = await accountUtility.getAllAccountTypes();
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminAccounts', {
    user: req.user,
    backgroundSetting,
    ordersNotShipped: notShippedOrders,
    accountTypes,
    schoolsRequiringGiveBackAction,
  });
}

async function searchAccounts(req, res) {
  const {
    name, email, accountType, createdFromDt, createdToDt, phoneNumber, accountNumber,
  } = req.body;

  const accounts = await accountUtility.searchAccounts(name, email, accountType, phoneNumber, createdFromDt, createdToDt, accountNumber);
  res.json({ result: accounts });
}

async function getProductItemScreen(req, res) {
  const { productItemNumber } = req.query;
  const productItem = await productItemUtility.getProductItemDetailsByNumber(productItemNumber);
  const product = await productUtility.getProductById(productItem.productId);
  const productVariants = await productUtility.getProductVariantsForProductItemGroupId(productItem.productItemGroupFk);
  const productVariant = await productUtility.getProductVariantDetailsById(productItem.productVariantFk);
  const account = await accountUtility.getAccountById(productItem.accountFk);

  let kid = null;
  let schoolClass = null;
  let school = null;

  if (productItem.kidFk !== null) kid = await kidUtility.getKidById(productItem.kidFk);

  if (kid !== null && kid.classFk !== null) schoolClass = await classUtility.getClassById(kid.classFk);

  if (schoolClass !== null) school = await schoolUtility.getSchoolFromSchoolId(schoolClass.schoolFk);

  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();

  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminProductItem', {
    user: req.user,
    productItem,
    product,
    account,
    backgroundSetting,
    productVariants,
    ordersNotShipped: notShippedOrders,
    productVariant,
    kid,
    schoolClass,
    school,
    schoolsRequiringGiveBackAction,
  });
}

async function getAccountDetailsPage(req, res) {
  const { number } = req.query;
  const account = await accountUtility.getAccountByNumber(number);
  const productItems = await productItemUtility.getProductItemsForAccountNumber(number);
  const orders = await orderUtility.getOrdersForAccountId(account.id);
  const accountType = await accountUtility.getAccountTypeById(account.accountTypeFk);

  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

  const kids = await kidUtility.getKidsFromAccountId(account.id);
  const school = await schoolUtility.getSchoolFromAccountId(account.id);
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminAccountDetail', {
    user: req.user,
    account,
    basketItemsDetails,
    ordersNotShipped: notShippedOrders,
    kids,
    productItems,
    backgroundSetting,
    orderHistory: orders,
    accountType,
    school,
    schoolsRequiringGiveBackAction,
  });
}

async function getKidsSearchScreen(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminKids', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped: notShippedOrders,
    backgroundSetting,
  });
}

async function searchKidsResults(req, res) {
  const {
    kidNumber, name, school, schoolClass,
  } = req.body;
  const kids = [];

  if (schoolClass === '' && school === '') {
    const kidsNoClass = await kidUtility.searchForKidsWithNoClass(kidNumber, name);
    kids.push(...kidsNoClass);
  }

  const schoolKids = await kidUtility.searchForKidsWithClass(kidNumber, name, schoolClass, school);
  kids.push(...schoolKids);

  res.json({ result: kids });
}

async function getOrdersSearchScreen(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('newAdminOrders', {
    user: req.user,
    ordersNotShipped: notShippedOrders,
    schoolsRequiringGiveBackAction,
    backgroundSetting,
  });
}

async function searchOrdersResults(req, res) {
  const {
    orderNumber, kidName, kidCode, school, schoolClass, fromDt, toDt,
  } = req.body;

  const orders = [];
  if (schoolClass === '' && school === '') {
    const ordersWithKidWithNoClass = await orderUtility.searchOrdersWithKidWithNoClass(orderNumber, kidCode, kidName, fromDt, toDt);
    orders.push(...ordersWithKidWithNoClass);

    const ordersWithNoKid = await orderUtility.searchOrdersWithNoKid(orderNumber, fromDt, toDt);
    orders.push(...ordersWithNoKid);
  }

  const schoolOrders = await orderUtility.searchOrdersLinkedToASchool(orderNumber, kidCode, kidName, school, schoolClass, fromDt, toDt);

  orders.push(...schoolOrders);

  res.json({ result: orders });
}

async function setBackground(req, res) {
  const { value } = req.body;

  await adminUtility.setBackgroundSetting(value, req.user.id);

  res.json({});
}

async function setShipped(req, res) {
  const { purchaseBasketId } = req.body;

  await orderUtility.setOrderToShipped(purchaseBasketId);

  return res.json({});
}

async function ordersNotShipped(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('ordersNotShipped', {
    user: req.user,
    backgroundSetting,
    schoolsRequiringGiveBackAction,
    ordersNotShipped: notShippedOrders,
  });
}

async function getKidsLinkedToSchoolScreen(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  const schoolDetails = await schoolUtility.getNumberOfKidsLinkedToEachSchool();

  res.render('linkedToSchools', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped: notShippedOrders,
    backgroundSetting,
    schoolDetails,
  });
}

async function getRevenueChartScreen(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('revenueChart', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped: notShippedOrders,
    backgroundSetting,
  });
}

async function getRevenues(res) {
  const revenues = await orderUtility.getTotalRevenues();
  return res.json({ revenues });
}

async function getAccountsWithBasketItems(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  const accounts = [];
  const accountWithNoPurchaseBasket = await accountUtility.getAccountsWithBasketItemsAndNoPurchaseBasket();

  const accountsWithPurchaseBasketPending = await accountUtility.getAccountsWithBasketItemsWithPurchaseBasketPending();
  accounts.push(...accountWithNoPurchaseBasket, ...accountsWithPurchaseBasketPending);

  const outstandingBalanceNoPurchaseBasket = await basketUtility.getOutstandingBalanceOfBasketItemsWithNoPurchaseBasket();

  const outstandingBalancePendingPurchaseBasket = await basketUtility.getOutstandingBalanceOfBasketItemsPendingPurchaseBasket();
  const outstandingAmount = parseFloat(outstandingBalanceNoPurchaseBasket) + parseFloat(outstandingBalancePendingPurchaseBasket);

  res.render('accountsWithBasketItems', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped: notShippedOrders,
    backgroundSetting,
    accounts,
    outstandingAmount,
  });
}

async function getAccountsLinkedNoOrder(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  const accounts = await accountUtility.getAccountsLinkedToSchoolWithNoOrder();
  res.render('accountsLinkedNoOrders', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped: notShippedOrders,
    backgroundSetting,
    accounts,
  });
}

async function getAccountsLinkedNoOrderButUploadedPicture(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const notShippedOrders = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  const accounts = await accountUtility.getAccountsLinkedToSchoolWithNoOrderButUploadedPicture();

  res.render('accountsLinkedNoOrdersButUploadedPicture', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped: notShippedOrders,
    backgroundSetting,
    accounts,
  });
}

async function updateOrderBasketItem(req, res) {
  const { basketItemId, productItemNumber } = req.body;

  const productItem = await productItemUtility.getProductItemDetailsByNumber(productItemNumber);

  const path = productItem.pdfPath;
  const fileName = path.replace(process.env.s3BucketPath, '');
  const picture = productItem.picture1Path;

  await basketUtility.updateOrderBasketItem(path, fileName, picture, basketItemId);
  res.json({});
}

module.exports = {
  getAccountDetailsPage,
  getAccountsLinkedNoOrder,
  getAccountsLinkedNoOrderButUploadedPicture,
  getAccountsWithBasketItems,
  getAdminDashboardPage,
  getAdminAccountPage,
  getKidsSearchScreen,
  getKidsLinkedToSchoolScreen,
  getOrdersSearchScreen,
  getProductItemScreen,
  getRevenueChartScreen,
  getRevenues,
  ordersNotShipped,
  searchAccounts,
  searchKidsResults,
  searchOrdersResults,
  setBackground,
  setShipped,
  updateOrderBasketItem,
};
