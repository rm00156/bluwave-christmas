const productTestHelper = require("../helper/productTestHelper");
const {
  createProductItemGroup,
  createProductItemObjectNoKid,
  createProductItemByVariantAccountAndKid,
} = require("../../utility/product/productItemUtility");
const {
  getProductVariantsForProductId,
} = require("../../utility/product/productUtility");

async function generateProductItem(
  account,
  kid,
  productVariantTypeId,
  templates,
  productType,
  productName
) {
  const productVariant =
    await productTestHelper.createProductVariantWithProductName(
      templates,
      productType,
      productVariantTypeId,
      1,
      productName
    );
  const productItemGroup = await createProductItemGroup();
  return createProductItemByVariantAccountAndKid(
    productVariant,
    productItemGroup,
    account,
    kid
  );
}

async function generateProductItemNoKid(
  account,
  productVariantTypeId,
  templates,
  productType,
  productName
) {
  const productVariant =
    await productTestHelper.createProductVariantWithProductName(
      templates,
      productType,
      productVariantTypeId,
      1,
      productName
    );
  const productItemGroup = await createProductItemGroup();
  const productId = productVariant.productFk;

  const productVariants = await getProductVariantsForProductId(productId);
  const productVariantItem = productVariants[0];
  const data = {
    picture1: "picture1",
    accountId: account.id
  };
  return createProductItemObjectNoKid(
    productVariantItem,
    data,
    "s3Path",
    productItemGroup,
    productItemGroup
  );
}

module.exports = {
  generateProductItem,
  generateProductItemNoKid,
};
