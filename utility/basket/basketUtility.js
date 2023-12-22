const models = require('../../models');
const { PURCHASE_BASKET_STATUS } = require('./purchaseBasketStatus');
const productItemUtility = require('../product/productItemUtility');
const { getKidsFromAccountId } = require('../kid/kidUtility');

async function createBasketItem(
  accountId,
  path,
  productItemId,
  text1,
  fileName,
  quantity,
  cost,
  picture,
  displayItem1,
  displayItem2,
  displayItem3,
) {
  return models.basketItem.create({
    path,
    productItemFk: productItemId,
    text1,
    fileName,
    quantity,
    accountFk: accountId,
    cost,
    picture,
    displayItem1,
    displayItem2,
    displayItem3,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createPurchaseBasket(status, total, subTotal, deliveryPrice, deliveryName, shippingAddressId) {
  return models.purchaseBasket.create({
    createdDttm: Date.now(),
    status,
    total,
    subTotal,
    shippingAddressFk: shippingAddressId,
    shippedFl: false,
    deliveryPrice,
    deliveryName,
    deleteFl: false,
    versionNo: 1,
  });
}

async function setBasketItemsToPurchaseBasketId(purchaseBasketId, basketItemIds) {
  await models.sequelize.query('update basketItems set purchaseBasketFk = :purchaseBasketId '
        + ' where id in (:basketItems)', {
    replacements: { purchaseBasketId, basketItems: basketItemIds },
    type: models.sequelize.QueryTypes.UPDATE,
  });
}

async function getCurrentBasketItemsDetailsNoPurchaseBasketForAccountId(accountId) {
  return models.sequelize.query('select pv.price, p.id as productId, pv.name as productVariantName, pi.id as productItemId, p.name as productName, b.id as basketItemId, b.* from  basketItems b '
        + ' inner join productItems pi on b.productItemFk = pi.id '
        + ' inner join productVariants pv on pi.productVariantFk = pv.id '
        + ' inner join products p on pv.productFk = p.id '
        + ' where b.accountFk = :accountId '
        + ' and purchaseBasketFk is null', {
    replacements: {
      accountId,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getCurrentBasketItemsDetailsWithPurchaseBasketForAccountId(accountId) {
  return models.sequelize.query('select pv.price, pi.id as productItemId, p.id as productId, pv.name as productVariantName, p.name as productName, b.id as basketItemId,  b.* from basketItems b '
        + ' inner join productItems pi on b.productItemFk = pi.id '
        + ' inner join productVariants pv on pi.productVariantFk = pv.id '
        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
        + ' inner join products p on pv.productFk = p.id '
        + ' where b.accountFk = :accountId '
        + ' and pb.status = :pending', {
    replacements: {
      accountId, pending: PURCHASE_BASKET_STATUS.PENDING,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getCurrentBasketItemsDetailsForAccountId(accountId) {
  const basketItems = await getCurrentBasketItemsDetailsNoPurchaseBasketForAccountId(accountId);

  let subTotal = 0;
  basketItems.forEach((basketItem) => {
    subTotal += parseFloat(basketItem.price) * basketItem.quantity;
  });

  const basketItemsWithPurchaseBasket = await getCurrentBasketItemsDetailsWithPurchaseBasketForAccountId(accountId);

  basketItemsWithPurchaseBasket.forEach((basketItem) => {
    subTotal += parseFloat(basketItem.price) * basketItem.quantity;
    basketItems.push(basketItem);
  });
  return {
    basketItems,
    subTotal,
  };
}

async function getBasketItemById(id) {
  return models.basketItem.findOne({
    where: {
      id,
    },
  });
}

async function getPurchaseBasketById(id) {
  return models.purchaseBasket.findOne({
    where: {
      id,
    },
  });
}

async function getOutstandingBalanceOfBasketItemsWithNoPurchaseBasket() {
  const outstandingAmounts = await models.sequelize.query('select sum(b.cost) as outstandingAmount from basketitems b '
  + ' where purchaseBasketfk is null ', { type: models.sequelize.QueryTypes.SELECT });

  return outstandingAmounts.length === 0 ? 0 : outstandingAmounts[0].outstandingAmount;
}

async function getOutstandingBalanceOfBasketItemsPendingPurchaseBasket() {
  const outstandingAmounts = await models.sequelize.query(
    'select sum(b.cost) as outstandingAmount from basketitems b '
                + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id where pb.status = :pending ',
    { replacements: { pending: 'Pending' }, type: models.sequelize.QueryTypes.SELECT },
  );

  return outstandingAmounts.length === 0 ? 0 : outstandingAmounts[0].outstandingAmount;
}

async function updateOrderBasketItem(path, fileName, picture, basketItemId) {
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
}

async function updateBaskeItemQuantityAndCostById(id, quantity, cost) {
  await models.basketItem.update(
    { quantity, cost, versionNo: models.sequelize.literal('versionNo + 1') },
    {
      where: {
        id,
      },
    },
  );
}

async function getBasketItemDetailsForBasketItemIds(basketItemIds) {
  return models.sequelize.query('select b.*, pv.name as productVariantName, p.name as productName, pv.price from basketItems b '
    + ' inner join productItems pi on b.productItemFk = pi.id '
    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
    + ' inner join products p on pv.productFk = p.id '
    + ' where b.id in (:basketItemIds) ', { replacements: { basketItemIds }, type: models.sequelize.QueryTypes.SELECT });
}

async function getBasketItemsDetailsForPurchaseBasketId(purchaseBasketId) {
  const basketItems = await models.sequelize.query(
    'select pv.price, a.email, pi.productItemNumber as code, concat( pv.name, " - ", p.name) '
      + ' as productVariantName, b.id as basketItemId, b.* , '
      + ' pi.text1 as kidName, if(b.displayItem3,:yes,:no) as displayAge,if(b.displayItem2,:yes,:no) '
      + ' as displayClass,if(b.displayItem1,:yes,:no) as displaySchool, FORMAT(b.cost,2) as cost, pi.classFk, pi.id as productItemId from  basketitems b '
      + ' inner join productItems pi on b.productItemFk = pi.id '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' inner join products p on pv.productFk = p.id '
      + ' inner join accounts a on b.accountFk = a.id '
      + ' where purchaseBasketFk = :purchaseBasketId',
    {
      replacements: {
        purchaseBasketId,
        yes: 'Yes',
        no: 'No',
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  let subTotal = 0;
  basketItems.forEach((basketItem) => {
    subTotal += parseFloat(basketItem.price) * basketItem.quantity;
  });

  return {
    basketItems,
    subTotal,
  };
}

async function updateClassForPurchasedItems(basketItems) {
  if (basketItems.length === 0) return;

  const accountId = basketItems[0].accountFk;
  const kids = await getKidsFromAccountId(accountId);

  const kid = kids.find((k) => k.classFk !== null);
  if (kid === undefined) return;

  const classId = kid.classFk;
  const productItemIds = basketItems.filter((b) => b.classFk === null).map((item) => item.productItemId);

  if (productItemIds.length === 0) return;
  await productItemUtility.setClassIdForProductItems(classId, productItemIds);
  // }
}

async function getPriceForBasketItemId(id) {
  const price = await models.sequelize.query('select pv.price from productItems pi '
                + ' inner join basketItems b on b.productItemFk = pi.id '
                + ' inner join productVariants pv on pi.productVariantFk = pv.id '
                + ' where b.id = :id', { replacements: { id }, type: models.sequelize.QueryTypes.SELECT });
  return price[0].price;
}

module.exports = {
  createBasketItem,
  createPurchaseBasket,
  setBasketItemsToPurchaseBasketId,
  getCurrentBasketItemsDetailsForAccountId,
  getOutstandingBalanceOfBasketItemsPendingPurchaseBasket,
  getBasketItemById,
  getBasketItemsDetailsForPurchaseBasketId,
  getPurchaseBasketById,
  getCurrentBasketItemsDetailsNoPurchaseBasketForAccountId,
  getCurrentBasketItemsDetailsWithPurchaseBasketForAccountId,
  getOutstandingBalanceOfBasketItemsWithNoPurchaseBasket,
  updateOrderBasketItem,
  getBasketItemDetailsForBasketItemIds,
  updateClassForPurchasedItems,
  getPriceForBasketItemId,
  updateBaskeItemQuantityAndCostById,
};
