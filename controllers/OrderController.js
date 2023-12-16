const models = require('../models');
const basketController = require('./BasketController');
const queueController = require('./QueueController');
const classController = require('./ClassController');
const schoolUtility = require('../utility/school/schoolUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');
const { PURCHASE_BASKET_STATUS } = require('../utility/basket/purchaseBasketStatus');

const stripe = require('stripe')(process.env.stripe_server);

const { endpointSecret } = process.env;
const PDFMerge = require('pdf-merge');
const aws = require('aws-sdk');
const archiver = require('archiver');

const fs = require('fs-extra');

aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

exports.getParentOrders = async function (req, res) {
  let { accountId } = req.query;

  accountId = accountId == undefined ? req.user.id : accountId;
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(accountId);
  const orders = await orderUtility.getOrdersForAccountId(accountId);
  res.render('parentOrders', { user: req.user, basketItemsDetails, orderHistory: orders });
};

exports.getParentOrder = async function (req, res) {
  const account = req.user;
  const { orderNumber } = req.query;
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
  const orderDetails = await getOrderDetailsForOrderNumber(orderNumber);
  const deliveryOption = await models.deliveryOption.findOne();
  res.render('parentOrder', {
    user: account, basketItemsDetails, order: orderDetails, deliveryOption, refunds: [],
  });
};

exports.getAdminOrder = async function (req, res) {
  const { orderNumber } = req.query;
  const orderDetails = await getOrderDetailsForOrderNumber(orderNumber);
  const deliveryOption = await models.deliveryOption.findOne();
  const backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('newAdminOrder', {
    user: req.user,
    ordersNotShipped,
    order: orderDetails,
    backgroundSetting,
    deliveryOption,
    refunds: [],
    schoolsRequiringGiveBackAction,
  });
};

exports.getOrdersForClassId = async function (classId) {
  const orderedKids = await models.sequelize.query(
    'select distinct pb.*, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from kids k '
    + ' inner join classes c on k.classFk = c.id '
    + ' inner join schools s on c.schoolFk = s.id '
    + ' inner join productItems pi on pi.kidFk = k.id '
    + ' inner join basketitems b on b.productItemFk = pi.id '
    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
    + ' where c.id = :classId '
    + ' and k.deleteFl = false '
    + ' and pb.status = :completed ',
    { replacements: { classId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );

  return orderedKids;
};

async function getOrderDetailsForOrderNumber(orderNumber) {
  const order = await models.purchaseBasket.findOne({
    where: {
      orderNumber,
    },
  });

  if (order.shippingAddressFk == null) {
    return await models.sequelize.query('select distinct b.id as basketItemId, b.*, a.accountNumber,  b.text1 as basketItemText1, pi.*, pv.name as productVariantName, pv.price, p.name as productName, pb.*,DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchasedDttm, pb.id as purchaseBasketId from basketItems b '
                    + ' inner join productItems pi on b.productItemFk = pi.id '
                    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
                    + ' inner join products p on pv.productFk = p.id '
                    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                    + ' inner join accounts a on pi.accountFk = a.id '
                    + ' where pb.status = :completed '
                    + ' and pb.orderNumber = :orderNumber', {
      replacements: { completed: 'Completed', orderNumber },
      type: models.sequelize.QueryTypes.SELECT,
    });
  }
  return await models.sequelize.query('select distinct b.id as basketItemId, b.*,a.accountNumber,  b.text1 as basketItemText1, pi.*, pv.name as productVariantName, pv.price, p.name as productName, pb.*,DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchasedDttm, s.*, pb.id as purchaseBasketId  from basketItems b '
                + ' inner join productItems pi on b.productItemFk = pi.id '
                + ' inner join productVariants pv on pi.productVariantFk = pv.id '
                + ' inner join products p on pv.productFk = p.id '
                + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                + ' inner join shippingAddresses s on pb.shippingAddressFk = s.id '
                + ' inner join accounts a on pi.accountFk = a.id '
                + ' where pb.status = :completed '
                + ' and pb.orderNumber = :orderNumber', {
    replacements: { completed: 'Completed', orderNumber },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

exports.purchase = async function (req, res) {
  // transaction history page
  const { total } = req.body;
  const { subTotal } = req.body;
  const purchaseTotal = total / 100;
  let basketItemIds = req.body.items;
  const { isShipping } = req.body;
  const { deliveryName } = req.body;
  const { deliveryPrice } = req.body;
  const { url } = req.body;

  const shippingId = await handleShippingDetails(isShipping, req);

  const purchaseBasket = await basketUtility.createPurchaseBasket(
    PURCHASE_BASKET_STATUS.PENDING,
    purchaseTotal,
    subTotal,
    deliveryPrice,
    deliveryName,
    shippingId,
  );

  basketItemIds = basketItemIds.split('\'').join('');
  basketItemIds = JSON.parse(basketItemIds);
  console.log(basketItemIds);
  await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, basketItemIds);

  models.sequelize.query('select b.*, pv.name as productVariantName, p.name as productName, pv.price from basketItems b '
            + ' inner join productItems pi on b.productItemFk = pi.id '
            + ' inner join productVariants pv on pi.productVariantFk = pv.id '
            + ' inner join products p on pv.productFk = p.id '
            + ' where b.id in (:basketItems) ', { replacements: { basketItems: basketItemIds }, type: models.sequelize.QueryTypes.SELECT })
    .then(async (basketItems) => {
      const lineItems = new Array();

      basketItems.forEach((basketItem) => {
        const amount = (parseFloat(basketItem.price)) * 100;
        const lineItem = {
          name: `${basketItem.productName}-${basketItem.productVariantName}`, amount, currency: 'gbp', quantity: basketItem.quantity,
        };
        lineItems.push(lineItem);
      });

      if ((isShipping == 'true')) {
        const amount = (parseFloat(deliveryPrice)) * 100;
        const lineItem = {
          name: deliveryName, amount, currency: 'gbp', quantity: 1,
        };
        lineItems.push(lineItem);
      }
      const urlPrefix = url;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: req.user.email,
        client_reference_id: purchaseBasket.id,
        success_url: `${urlPrefix}/purchaseSuccessful`,
        cancel_url: `${urlPrefix}/basket`,
      });

      console.log(session.id);
      res.json({ session });
    });
};

exports.sessionCompleted = async function (req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.log(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // console.log(event.data);
    // console.log(session.client_reference_id);
    const purchaseBasketId = session.client_reference_id;

    const now = new Date();
    const basketItemsDetails = await basketController.getBasketItemsDetailsForPurchaseBasketId(purchaseBasketId);

    const transaction = await models.sequelize.transaction();

    try {
      await models.purchaseBasket.update(
        {
          status: 'Completed',
          orderNumber: `blu-${purchaseBasketId}`,
          purchaseDttm: now,
        },
        {
          where: {
            id: purchaseBasketId,
          },
        },
        transaction,
      );
    } catch (err) {
      console.log(err);
      await transaction.rollback();

      throw 'purchasebasket update for orderNumber ' + `blu-${purchaseBasketId} failed`;
    }

    await transaction.commit();
    await updateClassForPurchasedItems(basketItemsDetails.basketItems);
    let purchaseDttm = now;
    let month = purchaseDttm.getMonth() + 1;
    month = month < 10 ? `0${month}` : month;
    let days = purchaseDttm.getDate();
    days = days < 10 ? `0${days}` : days;
    const years = purchaseDttm.getFullYear();

    let hours = purchaseDttm.getHours();
    hours = hours < 10 ? `0${hours}` : hours;
    let minutes = purchaseDttm.getMinutes();
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    let seconds = purchaseDttm.getSeconds();
    seconds = seconds < 10 ? `0${seconds}` : seconds;

    const time = `${hours}:${minutes}:${seconds}`;
    purchaseDttm = `${years}-${month}-${days}`;

    const purchaseBasket = await models.purchaseBasket.findOne({
      where: {
        id: purchaseBasketId,
      },
    });
    let { total } = purchaseBasket;
    total = (parseFloat(total)).toFixed(2);

    // await sendPurchaseEmail(false, basketItemsDetails.basketItems, 'blu-' + purchaseBasketId, purchaseDttm, total, time);
    await queueController.addPurchaseEmailJob('purchaseEmail', basketItemsDetails.basketItems, `blu-${purchaseBasketId}`, purchaseDttm, total, time);
    await queueController.addPurchaseEmailJob('purchaseEmailToBluwave', basketItemsDetails.basketItems, `blu-${purchaseBasketId}`, purchaseDttm, total, time);

    console.log(total);
    console.log(time);
    res.json({ received: true });
  }
};

async function updateClassForPurchasedItems(basketItemsDetails) {
  const productItemsWithClass = new Array();
  const productItemsWithoutClass = new Array();

  basketItemsDetails.forEach((item) => {
    if (item.classFk == null) productItemsWithoutClass.push(item);
    else productItemsWithClass.push(item);
  });

  if (productItemsWithClass.length == 0) return;

  if (productItemsWithoutClass.length == 0) return;

  const classId = productItemsWithClass[0].classFk;

  for (let i = 0; i < productItemsWithoutClass.length; i++) {
    const item = productItemsWithoutClass[i];

    await models.productItem.update({
      classFk: classId,
    }, {
      where: {
        id: item.productItemId,
      },
    });
  }
}

async function handleShippingDetails(isShipping, req) {
  if (isShipping == 'true') {
    const { line1 } = req.body;
    const { line2 } = req.body;
    const { city } = req.body;
    const { postCode } = req.body;
    const { fullName } = req.body;
    const countryId = req.body.country;

    return await models.shippingAddress.findOne({
      where: {
        addressLine1: line1,
        addressLine2: line2,
        city,
        postCode,
        fullName,
        countryFk: countryId,
      },
    }).then(async (shippingAddress) => {
      if (shippingAddress == null) {
        shippingAddress = await models.shippingAddress.create({
          // purchaseBasketFk:purchaseBasket.id,
          addressLine1: line1,
          addressLine2: line2,
          city,
          postCode,
          fullName,
          accountFk: req.user.id,
          countryFk: countryId,
        });
      }

      return shippingAddress.id;
    });
  }
  return null;
}

exports.purchaseSuccessful = async function (req, res) {
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(req.user.id);
  res.render('purchaseSuccessful2', { user: req.user, basketItemsDetails });
};

exports.getTotalOrderDetails = async function () {
  const result = await models.sequelize.query(
    'select count(id) as numberOfOrders, if(sum(subTotal) is null, 0, sum(subTotal)) as subTotal ,if(sum(total) is null, 0, sum(total)) as total from purchaseBaskets '
        + ' where status = :completed ',
    { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );

  return result.length == 0 ? { numberOfOrders: 0, total: 0 } : result[0];
};

exports.getTopFivePerformingProductVariants = async function () {
  return await models.sequelize.query('select p.displayImagePath, p.name as productName, pv.name as productVariantName, pv.price,  sum(b.quantity) as totalQuantity, '
        + ' sum(b.cost) as cost from products p '
        + ' inner join productVariants pv on pv.productFk = p.id '
        + ' inner join productItems pi on pi.productVariantFk = pv.id '
        + ' inner join basketItems b on b.productItemFk = pi.id '
        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
        + ' where pb.status = :completed '
        + ' group by pv.id having totalQuantity > 0 '
        + ' order by totalQuantity desc limit 5 ', { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT }).catch((err) => {
    console.log(err);
  });
};

exports.getOrderDetailsGroupByTypeForId = async function (purchaseBasketId, job) {
  // list of cards
  // list of calendars
  // order form
  let progress = 1;
  job.progress(progress);

  const calendars = await models.sequelize.query('select distinct b.* from purchasebaskets pb '
                    + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
                    + ' inner join productItems pi on b.productItemFk = pi.id '
                    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
                    + ' inner join products p on pv.productFk = p.id '
                    + ' inner join productTypes pt on p.productTypeFk = pt.id '
                    + ' where pb.status = :completed '
                    + ' and pt.type = :calendars '
                    + ' and pb.id = :id ', {
    replacements: { completed: 'Completed', id: purchaseBasketId, calendars: 'Calendars' },
    type: models.sequelize.QueryTypes.SELECT,
  });

  const cards = await models.sequelize.query('select distinct b.* from purchasebaskets pb '
                    + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
                    + ' inner join productItems pi on b.productItemFk = pi.id '
                    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
                    + ' inner join products p on pv.productFk = p.id '
                    + ' inner join productTypes pt on p.productTypeFk = pt.id '
                    + ' where pb.status = :completed '
                    + ' and pt.type = :cards '
                    + ' and pb.id = :id ', {
    replacements: { completed: 'Completed', id: purchaseBasketId, cards: 'Christmas Cards' },
    type: models.sequelize.QueryTypes.SELECT,
  });

  progress++;
  job.progress(progress);

  const s3 = new aws.S3();
  let params = {
    Bucket: process.env.bucketName,
  };

  let path = null;

  if (cards.length > 0) path = await classController.downloadPurchasedFiles(cards[0], params, 0, s3);

  if (cards.length > 1) {
    var files = new Array();
    var now = Date.now();
    files = await classController.asyncForEachDownload(cards, classController.downloadPurchasedFiles, params, files, s3);

    path = `${process.cwd()}/tmp/${now}${purchaseBasketId}_purchased.pdf`;
    await PDFMerge(files, { output: path });
    files.forEach((file) => {
      fs.unlink(file);
    });
  }

  progress++;
  job.progress(progress);

  let path2 = null;

  if (calendars.length > 0) path2 = await classController.downloadPurchasedFiles(calendars[0], params, 0, s3);

  if (calendars.length > 1) {
    var files = new Array();
    var now = Date.now();
    files = await classController.asyncForEachDownload(calendars, classController.downloadPurchasedFiles, params, files, s3);

    path2 = `${process.cwd()}/tmp/${now}${purchaseBasketId}_calendars_purchased.pdf`;

    await PDFMerge(files, { output: path2 });
    files.forEach((file) => {
      fs.unlink(file);
    });
  }

  progress++;
  job.progress(progress);

  const dir = `./tmp/${now}${purchaseBasketId}_purchases`;

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

  var now = Date.now();
  const archive = archiver('zip', { zlib: { level: 9 } });
  const fileName = `tmp/${purchaseBasketId}_${now}purchase_result.zip`;
  const stream = fs.createWriteStream(fileName);

  const archivePromise = new Promise((resolve, reject) => {
    archive.directory(dir, false).on('error', (err) => reject(err)).pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });

  await archivePromise;

  progress++;
  job.progress(progress);

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

exports.generateOrderDetails = async function (req, res) {
  const { purchaseBasketId } = req.body;

  const job = await queueController.generateOrderDetailsJob(purchaseBasketId);

  res.json({ id: job.id });
};

exports.getSearchOrders = async function (req, res) {
  const { orderNumber } = req.body;
  const { name } = req.body;
  const { code } = req.body;
  const { school } = req.body;
  const { schoolClass } = req.body;
  const { date } = req.body;

  const result = await models.sequelize.query(
    'select distinct p.id, DATE_FORMAT(p.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm, p.orderNumber,p.total, k.name, k.code, s.name as schoolName, c.name as className from purchaseBaskets p '
    + ' inner join basketitems b on b.purchaseBasketFk = p.id '
    + ' inner join productItems pi on b.productItemFk = pi.id '
    + ' inner join kids k on  pi.kidFk = k.id '
    + ' inner join classes c on k.classFk = c.id '
    + ' inner join schools s on c.schoolFk = s.id '
    + ' inner join shippingAddresses sh on p.shippingAddressFk = sh.id '
    + ' where p.status = :completed '
    + ' and k.name like  :name '
    + ' and k.code like :code '
    + ' and s.name like :school '
    + ' and c.name like :schoolClass '
    + ' and p.purchaseDttm like :date '
    + ' and p.orderNumber like :orderNumber order by p.purchaseDttm desc',
    {
      replacements: {
        name: `%${name}%`,
        code: `%${code}%`,
        school: `%${school}%`,
        schoolClass: `%${schoolClass}%`,
        orderNumber: `%${orderNumber}%`,
        date: `%${date}%`,
        completed: 'Completed',
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  const result2s = await models.sequelize.query(
    'select distinct p.id, DATE_FORMAT(p.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm,p.total, p.orderNumber, k.name, k.code, s.name as schoolName, c.name as className from purchaseBaskets p '
      + ' inner join basketitems b on b.purchaseBasketFk = p.id '
      + ' inner join productItems pi on b.productItemFk = pi.id '
      + ' inner join kids k on pi.kidFk = k.id '
      + ' inner join classes c on k.classFk = c.id '
      + ' inner join schools s on c.schoolFk = s.id '
      + ' where p.status = :completed '
      + ' and k.name like  :name '
      + ' and k.code like :code '
      + ' and s.name like :school '
      + ' and c.name like :schoolClass '
      + ' and p.purchaseDttm like :date '
      + ' and p.shippingAddressFk is null '
      + ' and p.orderNumber like :orderNumber order by p.purchaseDttm desc',
    {
      replacements: {
        name: `%${name}%`,
        code: `%${code}%`,
        school: `%${school}%`,
        schoolClass: `%${schoolClass}%`,
        orderNumber: `%${orderNumber}%`,
        date: `%${date}%`,
        completed: 'Completed',
        false: false,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  result2s.forEach((result2) => {
    result.push(result2);
  });

  const result3s = await models.sequelize.query(
    'select distinct p.id,  DATE_FORMAT(p.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm,p.total, p.orderNumber from purchaseBaskets p '
          + ' inner join basketitems b on b.purchaseBasketFk = p.id '
          + ' inner join productItems pi on b.productItemFk = pi.id '
          + ' where p.status = :completed '
          + ' and p.purchaseDttm like :date '
          + ' and pi.kidFk is null '
          + ' and p.orderNumber like :orderNumber order by p.purchaseDttm desc',
    {
      replacements: {
        orderNumber: `%${orderNumber}%`,
        date: `%${date}%`,
        completed: 'Completed',
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  result3s.forEach((result3) => {
    result.push(result3);
  });

  return res.json({ result });
};

exports.getSubTotalOfAllOrdersToday = async function () {
  const result = await models.sequelize.query(
    'select sum(subTotal) as subTotal from purchaseBaskets '
                + ' where status = :completed '
                + ' and purchaseDttm > CURDATE() ',
    { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );
  return result[0].subTotal == null ? 0.00 : (result[0].subTotal).toFixed(2);
};

exports.getAverageTimeFromSignUpToPurchaseInMinutes = async function () {
  const result = await models.sequelize.query(
    'select avg(TIMESTAMPDIFF(minute, a.created_at, pb.purchaseDttm)) as average from accounts a '
        + ' inner join basketitems b on b.accountFk = a.id '
        + ' inner join purchasebaskets pb on b.purchasebasketFk = pb.id '
        + ' where pb.status = :completed ',
    { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );

  return result[0].average == null ? 0 : parseFloat(result[0].average).toFixed(2);
};

exports.getNumberOfOrdersToday = async function () {
  const result = await models.sequelize.query(
    'select distinct count(id) as numberOfOrdersToday from purchasebaskets where status = :completed '
            + ' and purchaseDttm > curdate()',
    { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );

  return result[0].numberOfOrdersToday == null ? 0 : (result[0].numberOfOrdersToday);
};
