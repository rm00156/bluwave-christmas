const stripe = require('stripe')(process.env.stripe_server);

const { endpointSecret } = process.env;
const aws = require('aws-sdk');

const logger = require('pino')();

const models = require('../models');
const queueController = require('./QueueController');
const schoolUtility = require('../utility/school/schoolUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');
const generalUtility = require('../utility/general/generalUtility');
const {
  PURCHASE_BASKET_STATUS,
} = require('../utility/basket/purchaseBasketStatus');

const CURRENCY = 'gbp';

aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

async function getParentOrders(req, res) {
  const { accountId } = req.query;

  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(
    accountId === undefined ? req.user.id : accountId,
  );
  const orders = await orderUtility.getOrdersForAccountId(accountId);
  res.render('parentOrders', {
    user: req.user,
    basketItemsDetails,
    orderHistory: orders,
  });
}

async function getParentOrder(req, res) {
  const account = req.user;
  const { orderNumber } = req.query;
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
  const orderDetails = await orderUtility.getOrderDetailsForOrderNumber(
    orderNumber,
  );
  const deliveryOption = await orderUtility.getDeliveryOption();
  res.render('parentOrder', {
    user: account,
    basketItemsDetails,
    order: orderDetails,
    deliveryOption,
    refunds: [],
  });
}

async function getAdminOrder(req, res) {
  const { orderNumber } = req.query;
  const orderDetails = await orderUtility.getOrderDetailsForOrderNumber(
    orderNumber,
  );
  const deliveryOption = await orderUtility.getDeliveryOption();
  const backgroundSetting = await adminUtility.getBackgroundSetting(
    req.user.id,
  );
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
}

async function purchase(req, res) {
  const {
    isShipping,
    deliveryName,
    deliveryPrice,
    url,
    items,
    line1,
    line2,
    city,
    postCode,
    fullName,
    country,
    total,
    subTotal,
  } = req.body;

  const purchaseTotal = total / 100;
  const shippingId = isShipping === 'true'
    ? await orderUtility.getShippingDetails(
      line1,
      line2,
      city,
      postCode,
      fullName,
      country,
      req.user.id,
    )
    : null;

  const purchaseBasket = await basketUtility.createPurchaseBasket(
    PURCHASE_BASKET_STATUS.PENDING,
    purchaseTotal,
    subTotal,
    deliveryPrice,
    deliveryName,
    shippingId,
  );

  const splitItems = items.split("'").join('');
  const basketItemIds = JSON.parse(splitItems);

  await basketUtility.setBasketItemsToPurchaseBasketId(
    purchaseBasket.id,
    basketItemIds,
  );

  const basketItems = await basketUtility.getBasketItemDetailsForBasketItemIds(
    basketItemIds,
  );

  const lineItems = [];
  basketItems.forEach((basketItem) => {
    const amount = parseFloat(basketItem.price) * 100;
    const lineItem = {
      name: `${basketItem.productName}-${basketItem.productVariantName}`,
      amount,
      currency: CURRENCY,
      quantity: basketItem.quantity,
    };
    lineItems.push(lineItem);
  });

  if (isShipping === 'true') {
    const amount = parseFloat(deliveryPrice) * 100;
    const lineItem = {
      name: deliveryName,
      amount,
      currency: CURRENCY,
      quantity: 1,
    };
    lineItems.push(lineItem);
  }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: req.user.email,
    client_reference_id: purchaseBasket.id,
    success_url: `${url}/purchaseSuccessful`,
    cancel_url: `${url}/basket`,
  });

  res.json({ session });
}

async function sessionCompleted(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    logger.error(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const purchaseBasketId = session.client_reference_id;

    const now = new Date();
    const basketItemsDetails = await basketUtility.getBasketItemsDetailsForPurchaseBasketId(
      purchaseBasketId,
    );

    const transaction = await models.sequelize.transaction();

    try {
      await orderUtility.setPurchaseBasketToCompleted(now, purchaseBasketId);
    } catch (err) {
      logger.error(err);
      await transaction.rollback();

      throw new Error(
        `purchasebasket update for orderNumber blu-${purchaseBasketId} failed`,
      );
    }
    await transaction.commit();
    await basketUtility.updateClassForPurchasedItems(
      basketItemsDetails.basketItems,
    );
    const purchaseDttm = now;
    const { time, parsedDttm } = generalUtility.getParsedDttmAndTime(purchaseDttm);

    const purchaseBasket = await basketUtility.getPurchaseBasketById(
      purchaseBasketId,
    );

    const total = parseFloat(purchaseBasket.total).toFixed(2);

    await queueController.addPurchaseEmailJob(
      'purchaseEmail',
      basketItemsDetails.basketItems,
      `blu-${purchaseBasketId}`,
      parsedDttm,
      total,
      time,
    );
    await queueController.addPurchaseEmailJob(
      'purchaseEmailToBluwave',
      basketItemsDetails.basketItems,
      `blu-${purchaseBasketId}`,
      parsedDttm,
      total,
      time,
    );

    return res.json({ received: true });
  }

  return res.status(400).send('Error');
}

async function purchaseSuccessful(req, res) {
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(req.user.id);
  res.render('purchaseSuccessful2', { user: req.user, basketItemsDetails });
}

async function generateOrderDetails(req, res) {
  const { purchaseBasketId } = req.body;

  const job = await queueController.generateOrderDetailsJob(purchaseBasketId);

  res.json({ id: job.id });
}

async function getSearchOrders(req, res) {
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
}

module.exports = {
  getAdminOrder,
  generateOrderDetails,
  getParentOrder,
  getParentOrders,
  getSearchOrders,
  purchase,
  purchaseSuccessful,
  sessionCompleted,
};
