const models = require("../../models");

const fetch = require('node-fetch');
const generalUtility = require("../../utility/general/generalUtility");
const productItemUtility = require("../../utility/product/productItemUtility");
const productUtility = require("../../utility/product/productUtility");
const productItemTestHelper = require("../helper/productItemTestHelper");
const productTestHelper = require("../helper/productTestHelper");

const schoolTestHelper = require("../helper/schoolTestHelper");
const { PRODUCT_TYPES } = require("../../utility/product/productTypes");
const {
  PRODUCT_VARIANT_TYPE,
  PRODUCT_VARIANT_TYPES_ID,
} = require("../../utility/product/productVariantTypes");
const { TEMPLATES } = require("../../utility/product/template");

let productVariantType;
let calendarProductType;

describe("product utility tests", () => {
  beforeEach(async () => {
    await generalUtility.pauseForTimeInSecond(0.01);
    await models.sequelize.sync({ force: true, logging: false });

    productVariantType = await productUtility.createProductVariantTypes(
      PRODUCT_VARIANT_TYPES_ID.PACKAGE,
      PRODUCT_VARIANT_TYPE.PACKAGE
    );
    calendarProductType = await productUtility.createProductType(
      PRODUCT_TYPES.CALENDARS
    );
  });

  afterAll(async () => {
    // Close the database connection after running tests
    await models.sequelize.close();
    await generalUtility.deleteS3Folder('test/')
  });

  it("create product Item and get productItem by id and by number", async () => {
    const { kid, organiserAccount } =
      await schoolTestHelper.createNewSchoolWithKid();
    const productName = "Product_name";
    const productItem = await productItemTestHelper.generateProductItem(
      organiserAccount,
      kid,
      productVariantType.id,
      TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
      calendarProductType,
      productName
    );

    const getProductItemById = await productItemUtility.getProductItemById(productItem.id);
    expect(getProductItemById.id).toBe(productItem.id);

    const getProductItemByNumber = await productItemUtility.getProductItemByNumber(productItem.productItemNumber);
    expect(getProductItemByNumber.id).toBe(productItem.id);
  });

  it('generate new product item number', async () => {

    const { kid, organiserAccount } =
      await schoolTestHelper.createNewSchoolWithKid();
    const productName = "Product_name";
    await productItemTestHelper.generateProductItem(
      organiserAccount,
      kid,
      productVariantType.id,
      TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
      calendarProductType,
      productName
    );

    const newProductItemNumber = await productItemUtility.getNewProductItemNumber();
    const getProductItem = await productItemUtility.getProductItemByNumber(newProductItemNumber);

    expect(getProductItem).toBe(null);
  });

  it('generate productItem Pdf', async () => {

    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );
    const productId = productVariant.productFk;

    const productVariants = await productUtility.getProductVariantsForProductId(productId);
    const productVariantItem = productVariants[0];
    const s3Path = await productItemUtility.generateProductItemPdf([], productVariantItem);
    const response = await fetch(s3Path);
    expect(response.ok).toBe(true);
  }, 10000)
});
