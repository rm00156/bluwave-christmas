const productUtility = require("../../utility/product/productUtility");

async function createProductVariantWithProductNameTextAndPictureCount(
  templates,
  productType,
  productVariantTypeId,
  orderNo,
  productName,
  textCount,
  pictureCount
) {
  const template = await productUtility.createTemplate(
    templates,
    "",
    "42cm",
    "29.7cm",
    textCount,
    pictureCount,
    "defaultPicture1Path"
  );

  const product = await productUtility.createProduct(
    productType.id,
    productName,
    "",
    "",
    false,
    false
  );
  return productUtility.createProductVariant(
    productType.type,
    orderNo,
    product.id,
    productVariantTypeId,
    "22",
    template.id,
    ""
  );
}

async function createProductVariantWithProductIdTextAndPictureCount(
    templates,
    productType,
    productVariantTypeId,
    orderNo,
    productId,
    textCount,
    pictureCount
  ) {
    const template = await productUtility.createTemplate(
      templates,
      "",
      "42cm",
      "29.7cm",
      textCount,
      pictureCount,
      "defaultPicture1Path"
    );
   
    return productUtility.createProductVariant(
      productType.type,
      orderNo,
      productId,
      productVariantTypeId,
      "22",
      template.id,
      ""
    );
  }
async function createProductVariantWithProductName(
  templates,
  productType,
  productVariantTypeId,
  orderNo,
  productName
) {
  const template = await productUtility.createTemplate(
    templates,
    "",
    "42cm",
    "29.7cm",
    0,
    1,
    "defaultPicture1Path"
  );

  const product = await productUtility.createProduct(
    productType.id,
    productName,
    "",
    "",
    false,
    false
  );
  return productUtility.createProductVariant(
    productType.type,
    orderNo,
    product.id,
    productVariantTypeId,
    "22",
    template.id,
    ""
  );
}

async function createProductVariantForProduct(
  product,
  productType,
  orderNo,
  productVariantTypeId,
  templates
) {
  const template = await productUtility.createTemplate(
    templates,
    "",
    "",
    "",
    1,
    1,
    ""
  );

  return productUtility.createProductVariant(
    productType.type,
    orderNo,
    product.id,
    productVariantTypeId,
    "22",
    template.id,
    ""
  );
}

module.exports = {
  createProductVariantWithProductNameTextAndPictureCount,
  createProductVariantWithProductName,
  createProductVariantForProduct,
  createProductVariantWithProductIdTextAndPictureCount
};
