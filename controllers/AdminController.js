const models = require('../models');
const kidController = require('./KidController');
const accountUtility = require('../utility/account/accountUtility');
const orderController = require('./OrderController');
const schoolUtility = require('../utility/school/schoolUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');
const productUtility = require('../utility/product/productUtility');
const productItemUtility = require('../utility/product/productItemUtility');
const kidUtility = require('../utility/kid/kidUtility');
const classUtility = require('../utility/class/classUtility');

exports.getAdminDashboardPage = async function (req, res) {
  const orderDetails = await orderController.getTotalOrderDetails();
  const numberOfCustomers = await accountUtility.getNumberOfCustomers();
  const giveBackDetails = await schoolUtility.getGiveBackAmount();
  const numberOfSchools = await schoolUtility.getNumberOfSchools();
  const schoolDashboardStatus = await schoolUtility.getSchoolDashboardStatus();
  const schoolProgressDetails = await schoolUtility.getSchoolProgressDetails();
  const topFivePerformingProductVariants = await orderController.getTopFivePerformingProductVariants();
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const numberOfLinkedKids = await kidUtility.getNumberOfLinkedKids();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();
  const subTotalToday = await orderController.getSubTotalOfAllOrdersToday();
  const averageTimeFromSignUpToPurchaseInMinutes = await orderController.getAverageTimeFromSignUpToPurchaseInMinutes();
  const numberOfSignUpsToday = await accountUtility.getNumberOfSignUpsToday();
  const numberOfOrdersToday = await orderController.getNumberOfOrdersToday();

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
    ordersNotShipped,
    averageTimeFromSignUpToPurchaseInMinutes,
    numberOfLinkedKids,
    schoolsRequiringGiveBackAction,
    numberOfSignUpsToday,
    numberOfOrdersToday,
  });
};

exports.getAdminAccountPage = async function (req, res) {
  const accountTypes = await models.accountType.findAll({});
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminAccounts', {
    user: req.user,
    backgroundSetting,
    ordersNotShipped,
    accountTypes,
    schoolsRequiringGiveBackAction,
  });
};

exports.searchAccounts = async function (req, res) {
  const { name } = req.body;
  const { email } = req.body;
  const { accountType } = req.body;
  const { createdFromDt } = req.body;
  const { createdToDt } = req.body;
  const { phoneNumber } = req.body;
  const { accountNumber } = req.body;

  let query = 'select a.accountNumber,a.id, a.name, a.email, a.telephoneNumber as telephone, at.accountType, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as createdDt from accounts a '
    + ' inner join accountTypes at on a.accountTypeFk = at.id '
    + ' where (a.name like :name or a.name is null )'
    + ' and a.email like :email '
    + ' and (a.telephoneNumber like :phoneNumber or a.telephoneNumber is null) ';

  if (accountType != '0') query = `${query} and a.accountTypeFk = :accountType `;

  if (createdFromDt != undefined) query = `${query} and a.created_at >= :createdFromDt `;

  if (createdToDt != undefined) query = `${query} and a.created_at <= :createdToDt `;

  query = `${query} order by a.created_at desc`;

  await models.sequelize.query(
    query,
    {
      replacements: {
        name: `%${name}%`,
        email: `%${email}%`,
        accountType,
        phoneNumber: `%${phoneNumber}%`,
        createdFromDt: `%${createdFromDt}%`,
        createdToDt: `%${createdToDt}%`,
        accountNumber: `%${accountNumber}%`,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  )
    .then((accounts) => {
      res.json({ result: accounts });
    });
};

exports.getProductItemScreen = async function (req, res) {
  const { productItemNumber } = req.query;
  let productItem = await productItemUtility.getProductItemDetailsByNumber(productItemNumber);
  productItem = productItem[0];
  const product = await productUtility.getProductById(productItem.productId);
  const productVariants = await productUtility.getProductVariantsForProductItemGroupId(productItem.productItemGroupFk);
  const productVariant = await productUtility.getProductVariantDetailsById(productItem.productVariantFk);
  const account = await accountUtility.getAccountById(productItem.accountFk);

  let kid = null;
  let schoolClass = null;
  let school = null;

  if (productItem.kidFk != null) kid = await kidUtility.getKidById(productItem.kidFk);

  if (kid != null && kid.classFk != null) schoolClass = await classUtility.getClassById(kid.classFk);

  if (schoolClass != null) school = await schoolUtility.getSchoolFromSchoolId(schoolClass.schoolFk);

  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminProductItem', {
    user: req.user,
    productItem,
    product,
    account,
    backgroundSetting,
    productVariants,
    ordersNotShipped,
    productVariant,
    kid,
    schoolClass,
    school,
    schoolsRequiringGiveBackAction,
  });
};

exports.getAccountDetailsPage = async function (req, res) {
  const { number } = req.query;
  const account = await accountUtility.getAccountByNumber(number);
  const productItems = await productItemUtility.getProductItemsForAccountNumber(number);
  const orders = await orderUtility.getOrdersForAccountId(account.id);
  const accountType = await models.accountType.findOne({
    where: {
      id: account.accountTypeFk,
    },
  });

  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

  const kids = await kidUtility.getKidsFromAccountId(account.id);
  const school = await schoolUtility.getSchoolFromAccountId(account.id);
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminAccountDetail', {
    user: req.user,
    account,
    basketItemsDetails,
    ordersNotShipped,
    kids,
    productItems,
    backgroundSetting,
    orderHistory: orders,
    accountType,
    school,
    schoolsRequiringGiveBackAction,
  });
};

exports.getKidsSearchScreen = async function (req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('adminKids', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped,
    backgroundSetting,
  });
};

exports.searchKidsResults = async function (req, res) {
  const { kidNumber } = req.body;
  const { name } = req.body;
  const { school } = req.body;
  const { schoolClass } = req.body;

  let kids = [];

  if (schoolClass == '' && school == '') {
    kids = await models.sequelize.query(
      'select * from kids '
                + ' where code like :kidNumber '
                + ' and name like :name '
                + ' and classFk is null ',
      {
        replacements: {
          kidNumber: `%${kidNumber}%`,
          name: `%${name}%`,
        },
        type: models.sequelize.QueryTypes.SELECT,
      },
    );
  }

  const schoolKids = await models.sequelize.query(
    'select k.name, k.code , s.name as school, c.name as class from kids k '
        + ' inner join classes c on k.classFk = c.id '
        + ' inner join schools s on c.schoolFk = s.id '
        + ' where k.code like :kidNumber '
        + ' and k.name like :name '
        + ' and c.name like :schoolClass '
        + ' and s.name like :school ',
    {
      replacements: {
        kidNumber: `%${kidNumber}%`,
        name: `%${name}%`,
        schoolClass: `%${schoolClass}%`,
        school: `%${school}%`,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  ).catch((err) => {
    console.log(err);
  });

  schoolKids.forEach((kid) => {
    kids.push(kid);
  });

  res.json({ result: kids });
};

exports.getOrdersSearchScreen = async function (req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('newAdminOrders', {
    user: req.user,
    ordersNotShipped,
    schoolsRequiringGiveBackAction,
    backgroundSetting,
  });
};

exports.searchOrdersResults = async function (req, res) {
  const { orderNumber } = req.body;
  const { kidName } = req.body;
  const { kidCode } = req.body;
  const { school } = req.body;
  const { schoolClass } = req.body;
  const { fromDt } = req.body;
  const { toDt } = req.body;

  let orders = [];
  let query;
  if (schoolClass == '' && school == '') {
    query = 'select distinct pb.total, pb.orderNumber, pb.subTotal, k.name as kidName, k.code as kidCode,DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb '
                + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
                + ' inner join productItems pi on b.productItemFk = pi.id '
                + ' inner join kids k on pi.kidFk = k.id '
                + ' where pb.status = :completed '
                + ' and pb.orderNumber like :orderNumber '
                + ' and k.name like :kidName '
                + ' and k.code like :kidCode '
                + ' and k.classFk is null ';

    if (fromDt != '') query = `${query} and pb.purchaseDttm >= :fromDt `;

    if (toDt != '') query = `${query} and pb.purchaseDttm <= :toDt `;

    orders = await models.sequelize.query(
      query,
      {
        replacements: {
          kidCode: `%${kidCode}%`,
          kidName: `%${kidName}%`,
          orderNumber: `%${orderNumber}%`,
          completed: 'Completed',
          fromDt,
          toDt,
        },
        type: models.sequelize.QueryTypes.SELECT,
      },
    );

    query = 'select distinct pb.total, pb.orderNumber, pb.subTotal, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb '
            + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
            + ' inner join productItems pi on b.productItemFk = pi.id '
            + ' where pb.status = :completed '
            + ' and pb.orderNumber like :orderNumber '
            + ' and pi.kidFk is null ';

    if (fromDt != '') query = `${query} and pb.purchaseDttm >= :fromDt `;

    if (toDt != '') query = `${query} and pb.purchaseDttm <= :toDt `;

    const orders2 = await models.sequelize.query(
      query,
      {
        replacements: {
          orderNumber: `%${orderNumber}%`,
          completed: 'Completed',
          fromDt,
          toDt,
        },
        type: models.sequelize.QueryTypes.SELECT,
      },
    );

    orders2.forEach((o) => {
      orders.push(o);
    });
  }

  query = 'select distinct pb.total, pb.subTotal,pb.orderNumber, k.name as kidName, k.code as kidCode, s.name as school, c.name as schoolClass, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb '
        + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
        + ' inner join productItems pi on b.productItemFk = pi.id '
        + ' inner join kids k on pi.kidFk = k.id '
        + ' inner join classes c on k.classFk = c.id '
        + ' inner join schools s on c.schoolFk = s.id '
        + ' where pb.orderNumber like :orderNumber '
        + ' and k.name like :kidName '
        + ' and k.code like :kidCode '
        + ' and s.name like :school '
        + ' and c.name like :schoolClass '
        + ' and pb.status = :completed ';

  if (fromDt != '') query = `${query} and pb.purchaseDttm >= :fromDt `;

  if (toDt != '') query = `${query} and pb.purchaseDttm <= :toDt `;

  const schoolOrders = await models.sequelize.query(
    query,
    {
      replacements: {
        kidCode: `%${kidCode}%`,
        kidName: `%${kidName}%`,
        orderNumber: `%${orderNumber}%`,
        completed: 'Completed',
        school: `%${school}%`,
        schoolClass: `%${schoolClass}%`,
        fromDt,
        toDt,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  schoolOrders.forEach((order) => {
    orders.push(order);
  });

  res.json({ result: orders });
};

exports.setBackground = async function (req, res) {
  const { value } = req.body;

  await models.setting.update({
    value,
    versionNo: models.sequelize.literal('versionNo + 1'),
  }, {
    where: {
      name: 'Background Color',
      accountFk: req.user.id,
    },
  });

  res.json({});
};

exports.setShipped = async function (req, res) {
  const { purchaseBasketId } = req.body;

  await models.purchaseBasket.update(
    {
      shippedFl: true,
      shippedDttm: Date.now(),
      verisonNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: purchaseBasketId,
      },
    },
  );

  return res.json({});
};

exports.ordersNotShipped = async function (req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('ordersNotShipped', {
    user: req.user,
    backgroundSetting,
    schoolsRequiringGiveBackAction,
    ordersNotShipped,
  });
};

exports.getKidsLinkedToSchoolScreen = async function (req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  const schoolDetails = await schoolUtility.getNumberOfKidsLinkedToEachSchool();

  res.render('linkedToSchools', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped,
    backgroundSetting,
    schoolDetails,
  });
};

exports.getRevenueChartScreen = async function (req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('revenueChart', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped,
    backgroundSetting,
  });
};

exports.getRevenues = async function (req, res) {
  const revenues = await models.sequelize.query(
    'select distinct cast(purchaseDttm as date) as dates, sum(subtotal) as subTotal from purchasebaskets '
            + ' where status = :completed '
            + ' group by dates having sum(subtotal) > 0 ',
    { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );
  return res.json({ revenues });
};

exports.getAccountsWithBasketItems = async function (req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  const accounts = await models.sequelize.query('select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at from basketitems b '
                        + ' inner join accounts a on b.accountFk = a.id  where purchaseBasketfk is null '
                        + ' order by a.created_at ', { type: models.sequelize.QueryTypes.SELECT });

  const accounts2 = await models.sequelize.query(
    'select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at from basketitems b '
                        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                        + ' inner join accounts a on b.accountFk = a.id '
                        + ' where pb.status = :pending ',
    { replacements: { pending: 'Pending' }, type: models.sequelize.QueryTypes.SELECT },
  );
  accounts.push(...accounts2);

  console.log(accounts);
  let result = await models.sequelize.query('select sum(b.cost) as outstandingAmount from basketitems b '
                + ' where purchaseBasketfk is null ', { type: models.sequelize.QueryTypes.SELECT });

  let outstandingAmount = result[0].outstandingAmount == null ? 0 : result[0].outstandingAmount;
  result = await models.sequelize.query(
    'select sum(b.cost) as outstandingAmount from basketitems b '
                + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id where pb.status = :pending ',
    { replacements: { pending: 'Pending' }, type: models.sequelize.QueryTypes.SELECT },
  );
  outstandingAmount = parseFloat(outstandingAmount) + parseFloat(result[0].outstandingAmount == null ? 0 : result[0].outstandingAmount);

  res.render('accountsWithBasketItems', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped,
    backgroundSetting,
    accounts,
    outstandingAmount,
  });
};

exports.getAccountsLinkedNoOrder = async function (req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  const accounts = await models.sequelize.query('select distinct s.name as school, a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at  from productitems pi '
        + ' inner join accounts a on pi.accountFk = a.id '
        + ' inner join classes c on c.id = pi.classFk '
        + ' inner join schools s on c.schoolFk = s.id '
        + ' where accountFk not in (select b.accountFk from purchasebaskets pb '
        + ' inner join basketitems b on b.purchasebasketFk = pb.id '
        + ' where pb.status = :completed )', { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT });

  res.render('accountsLinkedNoOrders', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped,
    backgroundSetting,
    accounts,
  });
};

exports.getAccountsLinkedNoOrderButUploadedPicture = async function (req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  const accounts = await models.sequelize.query('select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at  from productitems pi '
            + ' inner join accounts a on pi.accountFk = a.id where classFk is not null '
            + ' and accountFk not in (select b.accountFk from purchasebaskets pb '
            + ' inner join basketitems b on b.purchasebasketFk = pb.id '
            + ' where pb.status = :completed ) and pi.picture1Path != :defaultPic ', {
    replacements: { completed: 'Completed', defaultPic: 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Pictures/1665963540329_191.png' },
    type: models.sequelize.QueryTypes.SELECT,
  });

  res.render('accountsLinkedNoOrdersButUploadedPicture', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    ordersNotShipped,
    backgroundSetting,
    accounts,
  });
};

exports.updateOrderBasketItem = async function (req, res) {
  const { basketItemId } = req.body;
  const { productItemNumber } = req.body;

  let productItem = await productItemUtility.getProductItemDetailsByNumber(productItemNumber);
  productItem = productItem[0];

  const path = productItem.pdfPath;
  const fileName = path.replace(process.env.s3BucketPath, '');
  const picture = productItem.picture1Path;

  await models.basketItem.update({
    path,
    fileName,
    picture,
    verisonNo: models.sequelize.literal('versionNo + 1'),
  }, {
    where: {
      id: basketItemId,
    },
  });

  res.json({});
};
