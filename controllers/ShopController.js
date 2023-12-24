const basketUtility = require('../utility/basket/basketUtility');
const productUtility = require('../utility/product/productUtility');

async function shop(req, res) {
  const account = req.user;
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

  const { category } = req.query;
  let productType;
  if (category !== undefined) productType = await productUtility.getProductTypeByType(category);

  const productTypes = await productUtility.getAllProductTypes();
  if (productType == null) productType = productTypes[0];

  const products = await productUtility.getAllProductsByProductTypeId(productType.id);
  res.render('shop2', {
    user: account, basketItemsDetails, products, productType,
  });
}

module.exports = {
  shop,
};
