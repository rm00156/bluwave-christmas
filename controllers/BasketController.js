const models = require('../models');
const parentController = require('./ParentController');
const {
  getPriceForBasketItemId, createBasketItem,
  updateBaskeItemQuantityAndCostById, getCurrentBasketItemsDetailsForAccountId,
} = require('../utility/basket/basketUtility');
const productItemUtility = require('../utility/product/productItemUtility');
const productUtility = require('../utility/product/productUtility');

const JOHN_DOE = 'John Doe';
const UNITED_KINGDOM = 'United Kingdom';

async function addToBasket(req, res) {
  const { quantity, productItemId } = req.body;
  const accountId = req.user.id;

  const productItem = await productItemUtility.getProductItemById(productItemId);
  const productVariant = await productUtility.getProductVariantById(productItem.productVariantFk);

  const cost = parseInt(quantity, 10) * parseFloat(productVariant.price);
  const doesProductItemStillHaveDefaultPictures = await productItemUtility.doesProductItemStillHaveDefaultPictures(productItem);
  if (doesProductItemStillHaveDefaultPictures && ((productVariant.productFk === 1 || productVariant.productFk === 2 || productVariant.productFk === 4) || productVariant.orderNo === 2)) {
    res.json({ error: 'Please add picture to the card before attempting to add to basket' });
  } else if (productItem.text1 === JOHN_DOE) {
    res.json({ error: 'Please update name to add to basket' });
  } else {
    const path = productItem.pdfPath;
    const fileName = path.replace(process.env.s3BucketPath, '');

    await createBasketItem(
      accountId,
      path,
      productItemId,
      productItem.text1,
      fileName,
      quantity,
      cost,
      productItem.picture1Path,
      productItem.displayItem1,
      productItem.displayItem2,
      productItem.displayItem3,
    );

    const basketItemDetails = await getCurrentBasketItemsDetailsForAccountId(productItem.accountFk);
    res.json({ numberOfBasketItems: basketItemDetails.basketItems.length, subTotal: basketItemDetails.subTotal.toFixed(2) });
  }
}

async function basket(req, res) {
  const account = req.user;
  const basketItemsDetails = await getCurrentBasketItemsDetailsForAccountId(account.id);
  const isDisplayShippingSectionDetail = await parentController.isDisplayShippingSectionDetail(account.id);

  const deliveryOption = await models.deliveryOption.findOne();
  const countries = await models.country.findAll({});
  const countryList = countries.filter((o) => o.name === UNITED_KINGDOM);
  countries.forEach((country) => {
    if (country.name !== UNITED_KINGDOM) countryList.push(country);
  });

  countryList.push(UNITED_KINGDOM);

  const total = isDisplayShippingSectionDetail.isDisplayShippingSection ? (parseFloat(basketItemsDetails.subTotal) + parseFloat(deliveryOption.option2Price)).toFixed(2) : (parseFloat(basketItemsDetails.subTotal)).toFixed(2);
  res.render('basket3', {
    user: account,
    basketItemsDetails,
    isDisplayShippingSectionDetail,
    total,
    deliveryOption,
    countries: countryList,
  });
}

async function updateBasketItem(req, res) {
  const { basketItemId } = req.body;
  const quantity = req.body.newQuantity;

  const price = await getPriceForBasketItemId(basketItemId);

  const price2dp = price.toFixed(2);

  const cost = quantity * price2dp;
  await updateBaskeItemQuantityAndCostById(basketItemId, quantity, cost);
  res.json({});
}

async function getIsDisplayCalendarsOptions(accountId) {
  const count1 = await models.sequelize.query(
    'select count(b.id) as count from productTypes pt '
    + ' inner join products p on p.productTypeFk = pt.id '
    + ' inner join productVariants pv on pv.productFk = p.id '
    + ' inner join productItems pi on pi.productVariantFk = pv.id '
    + ' inner join basketItems b on b.productItemFk = pi.id '
    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
    + ' where pb.status !== :completed '
    + ' and pt.type = :calendar '
    + ' and b.accountFk = :accountId ',
    { replacements: { completed: 'Completed', calendar: 'Calendar', accountId }, type: models.sequelize.QueryTypes.SELECT },
  );

  const count2 = await models.sequelize.query(
    'select count(b.id) as count from productTypes pt '
    + ' inner join products p on p.productTypeFk = pt.id '
    + ' inner join productVariants pv on pv.productFk = p.id '
    + ' inner join productItems pi on pi.productVariantFk = pv.id '
    + ' inner join basketItems b on b.productItemFk = pi.id '
    + ' where pt.type = :calendar '
    + ' and b.accountFk = :accountId '
    + ' and b.purchaseBasketFk is null ',
    { replacements: { calendar: 'Calendar', accountId }, type: models.sequelize.QueryTypes.SELECT },
  );

  const count = count1[0].count + count2[0].count;

  return count === 0;
}

async function mightLike(req, res) {
  const accountId = req.user.id;

  const basketItems = await getCurrentBasketItemsDetailsForAccountId(accountId);

  const productIds = [];

  basketItems.basketItems.forEach((item) => {
    productIds.push(item.productId);
  });

  if (productIds.length === 0) return res.redirect('/basket');

  const products = await models.sequelize.query(
    'select p.*, pv.price from products p '
            + ' inner join productVariants pv on pv.productFk = p.id where p.id not in (:productIds) '
            + ' and pv.orderNo = 1 '
            + ' and pv.id = (select id from productVariants where productFk = p.id limit 1)',
    { replacements: { productIds }, type: models.sequelize.QueryTypes.SELECT },
  );

  return res.render('mightLike', { user: req.user, products, basketItemsDetails: basketItems });
}

module.exports = {
  addToBasket,
  basket,
  getIsDisplayCalendarsOptions,
  mightLike,
  updateBasketItem,
};
