const productTestHelper = require('../helper/productTestHelper');
const productItemUtility = require('../../utility/product/productItemUtility');

async function generateProductItem(account, kid, productVariantTypeId, templates, productType, productName) {
  const productVariant = await productTestHelper.createProductVariantWithProductName(templates, productType, productVariantTypeId, 1, productName);
  const productItemGroup = await productItemUtility.createProductItemGroup();
  return productItemUtility.createProductItemByVariantAccountAndKid(productVariant, productItemGroup, account, kid);
}

async function generateProductItemNoKid(account, productVariantTypeId, templates, productType, productName) {

  const productVariant = await productTestHelper.createProductVariantWithProductName(templates, productType, productVariantTypeId, 1, productName);
  const productItemGroup = await productItemUtility.createProductItemGroup();
  const productId = productVariant.productFk;

  const productVariants = await productUtility.getProductVariantsForProductId(
    productId
  );
  const productVariantItem = productVariants[0];
  return productItemUtility.createProductItemObjectNoKid(productVariantItem, productItemGroup, account);
  
}

module.exports = {
  generateProductItem,
  generateProductItemNoKid
};



