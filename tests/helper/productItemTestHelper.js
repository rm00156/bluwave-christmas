const productTestHelper = require('../helper/productTestHelper');
const productItemUtility = require('../../utility/product/productItemUtility');

async function generateProductItem(account, kid, productVariantTypeId, templates, productType, productName) {
  const productVariant = await productTestHelper.createProductVariantWithProductName(templates, productType, productVariantTypeId, 1, productName);
  const productItemGroup = await productItemUtility.createProductItemGroup();
  return await productItemUtility.createProductItemByVariantAccountAndKid(productVariant, productItemGroup, account, kid);
}

module.exports = {
  generateProductItem,
};



