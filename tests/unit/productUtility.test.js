const models = require("../../models");

const generalUtility = require("../../utility/general/generalUtility");
const productTestHelper = require("../helper/productTestHelper");
const schoolTestHelper = require("../helper/schoolTestHelper");
const productItemTestHelper = require("../helper/productItemTestHelper");
const productUtility = require("../../utility/product/productUtility");
const productItemUtility = require("../../utility/product/productItemUtility");
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
  });

  it("create productVariant, get productVariant and details by id", async () => {
    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );

    const getProductVariant = await productUtility.getProductVariantById(
      productVariant.id
    );
    expect(productVariant.id).toBe(getProductVariant.id);

    const getProductVariantDetails =
      await productUtility.getProductVariantDetailsById(productVariant.id);
    expect(productVariant.id).toBe(getProductVariantDetails.id);
    expect(getProductVariantDetails.productVariantType).toBe(
      productVariantType.type
    );
  });

  it("create productVariantType and get productVariantType by id", async () => {
    const getProductVariantType =
      await productUtility.getProductVariantTypeById(productVariantType.id);
    expect(productVariantType.id).toBe(getProductVariantType.id);
  });

  it("create template and get template by id", async () => {
    const template = await productUtility.createTemplate(
      TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
      "",
      "",
      "",
      1,
      1,
      ""
    );
    const getTemplate = await productUtility.getTemplateById(template.id);
    expect(template.id).toBe(getTemplate.id);
  });

  it("create product and get product by id", async () => {
    const name = "product";
    const description = "desription";
    const displayImagePath = "display_image";
    const saleFl = false;
    const kidFl = true;

    const product = await productUtility.createProduct(
      calendarProductType.id,
      name,
      description,
      displayImagePath,
      saleFl,
      kidFl
    );

    const getProduct = await productUtility.getProductById(product.id);

    expect(getProduct.id).toBe(product.id);
    expect(getProduct.productNumber).toBe(product.productNumber);
    expect(getProduct.name).toBe(product.name);
    expect(getProduct.description).toBe(product.description);
    expect(getProduct.saleFl === 1).toBe(product.saleFl);
    expect(getProduct.kidFl === 1).toBe(product.kidFl);
  });

  it("create product type and get product type by name", async () => {
    const getProductType = await productUtility.getProductTypeByType(
      PRODUCT_TYPES.CALENDARS
    );

    expect(calendarProductType.id).toBe(getProductType.id);
  });

  it("get product from productItem id", async () => {
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

    const product = await productUtility.getProductFromProductItemId(
      productItem.id
    );
    expect(product.name).toBe(productName);
  });

  it("get product type from product variant id", async () => {
    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );

    const productType = await productUtility.getProductTypeByProductVariantId(
      productVariant.id
    );

    expect(productType.id).toBe(calendarProductType.id);
  });

  it("get all product types", async () => {
    const christmasCardType = await productUtility.createProductType(
      PRODUCT_TYPES.CHRISTMAS_CARDS
    );
    const productTypes = await productUtility.getAllProductTypes();

    const productTypeIds = productTypes.map((productType) => productType.type);

    expect(productTypeIds).toEqual([
      calendarProductType.type,
      christmasCardType.type,
    ]);
  });

  it("get product by number", async () => {
    const productNotExist = await productUtility.getProductByNumber("23323");
    expect(productNotExist).toBe(null);

    const name = "product";
    const description = "desription";
    const displayImagePath = "display_image";
    const saleFl = false;
    const kidFl = true;

    const product = await productUtility.createProduct(
      calendarProductType.id,
      name,
      description,
      displayImagePath,
      saleFl,
      kidFl
    );

    const getProduct = await productUtility.getProductByNumber(
      product.productNumber
    );

    expect(product.id).toBe(getProduct.id);
  });

  it("get product by id", async () => {
    const productNotExist = await productUtility.getProductById("23323");
    expect(productNotExist).toBe(null);

    const name = "product";
    const description = "desription";
    const displayImagePath = "display_image";
    const saleFl = false;
    const kidFl = true;

    const product = await productUtility.createProduct(
      calendarProductType.id,
      name,
      description,
      displayImagePath,
      saleFl,
      kidFl
    );

    const getProduct = await productUtility.getProductById(product.id);

    expect(product.id).toBe(getProduct.id);
  });

  it("get all products by product type id", async () => {
    const name1 = "product1";
    const name2 = "product2";

    await productTestHelper.createProductVariantWithProductName(
      TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
      calendarProductType,
      productVariantType.id,
      1,
      name1
    );

    await productTestHelper.createProductVariantWithProductName(
      TEMPLATES.CALENDAR_LANDSCAPE_GREEN,
      calendarProductType,
      productVariantType.id,
      1,
      name2
    );

    const allProductsForProductType =
      await productUtility.getAllProductsByProductTypeId(
        calendarProductType.id
      );
    const allProductNames = allProductsForProductType.map(
      (product) => product.name
    );
    expect(allProductNames).toEqual([name1, name2]);
  });

  it("get productType by type", async () => {
    const getProductType = await productUtility.getProductTypeByType(
      PRODUCT_TYPES.CALENDARS
    );
    expect(getProductType.id).toBe(calendarProductType.id);
  });

  it("get productVariants for productId", async () => {
    const name = "product";
    const description = "desription";
    const displayImagePath = "display_image";
    const saleFl = false;
    const kidFl = true;
    const product = await productUtility.createProduct(
      calendarProductType.id,
      name,
      description,
      displayImagePath,
      saleFl,
      kidFl
    );
    const productVariant1 =
      await productTestHelper.createProductVariantForProduct(
        product,
        calendarProductType,
        1,
        productVariantType.id,
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE
      );
    const productVariant2 =
      await productTestHelper.createProductVariantForProduct(
        product,
        calendarProductType,
        2,
        productVariantType.id,
        TEMPLATES.CALENDAR_LANDSCAPE_GREEN
      );

    const productVariants = await productUtility.getProductVariantsForProductId(
      product.id
    );
    const productVariantIds = productVariants.map(
      (productVariant) => productVariant.id
    );

    expect(productVariantIds).toEqual([productVariant1.id, productVariant2.id]);
  });

  it("get productVariants for productItemGroup by id", async () => {
    const name = "product";
    const description = "desription";
    const displayImagePath = "display_image";
    const saleFl = false;
    const kidFl = true;
    const product = await productUtility.createProduct(
      calendarProductType.id,
      name,
      description,
      displayImagePath,
      saleFl,
      kidFl
    );
    const productVariant1 =
      await productTestHelper.createProductVariantForProduct(
        product,
        calendarProductType,
        1,
        productVariantType.id,
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE
      );
    const productVariant2 =
      await productTestHelper.createProductVariantForProduct(
        product,
        calendarProductType,
        2,
        productVariantType.id,
        TEMPLATES.CALENDAR_LANDSCAPE_GREEN
      );

    const { organiserAccount, kid } =
      await schoolTestHelper.createNewSchoolWithKid();
    const productItemGroup = await productItemUtility.createProductItemGroup();
    const productItem1 =
      await productItemUtility.createProductItemByVariantAccountAndKid(
        productVariant1,
        productItemGroup,
        organiserAccount,
        kid
      );
    await productItemUtility.createProductItemByVariantAccountAndKid(
      productVariant2,
      productItemGroup,
      organiserAccount,
      kid
    );

    const productVariants =
      await productUtility.getProductVariantsForProductItemGroupId(
        productItem1.productItemGroupFk
      );
    const productVariantIds = productVariants.map(
      (productVariant) => productVariant.id
    );

    expect(productVariantIds).toEqual([productVariant1.id, productVariant2.id]);
  });

  it("get product by name", async () => {
    const productNotExist = await productUtility.getProductByName("23323");
    expect(productNotExist).toBe(null);

    const name = "product";
    const description = "desription";
    const displayImagePath = "display_image";
    const saleFl = false;
    const kidFl = true;

    const product = await productUtility.createProduct(
      calendarProductType.id,
      name,
      description,
      displayImagePath,
      saleFl,
      kidFl
    );

    const getProduct = await productUtility.getProductByName(name);

    expect(product.id).toBe(getProduct.id);
  });

  it("get new product Number", async () => {
    const name = "product";
    const description = "desription";
    const displayImagePath = "display_image";
    const saleFl = false;
    const kidFl = true;
    await productUtility.createProduct(
      calendarProductType.id,
      name,
      description,
      displayImagePath,
      saleFl,
      kidFl
    );

    const newProductNumber = await productUtility.getNewProductNumber();

    const getProduct = await productUtility.getProductByNumber(
      newProductNumber
    );

    expect(getProduct).toBe(null);
  });

  it('search for product by number only', async () => {

    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );
    const product = await productUtility.getProductById(productVariant.productFk);
    
    const search = await productUtility.searchForProductByNumberNameProductTypeOrStatus(product.productNumber, '', '0', '0');
    expect(search.length).toBe(1);
    const result = search[0];
    expect(result.id).toBe(product.id);

    const emptySearch = await productUtility.searchForProductByNumberNameProductTypeOrStatus('abcd', '', '0', '0');
    expect(emptySearch.length).toBe(0);
  })

  it('search for product by name only', async () => {

    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );
    const product = await productUtility.getProductById(productVariant.productFk);
    
    const search = await productUtility.searchForProductByNumberNameProductTypeOrStatus('', product.name, '0', '0');
    expect(search.length).toBe(1);
    const result = search[0];
    expect(result.id).toBe(product.id);

    const emptySearch = await productUtility.searchForProductByNumberNameProductTypeOrStatus('', 'abcd', '0', '0');
    expect(emptySearch.length).toBe(0);
  })

  it('search for product by productType only', async () => {

    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );
    const product = await productUtility.getProductById(productVariant.productFk);
    
    const search = await productUtility.searchForProductByNumberNameProductTypeOrStatus('', '', calendarProductType.id, '0');
    expect(search.length).toBe(1);
    const result = search[0];
    expect(result.id).toBe(product.id);

    const emptySearch = await productUtility.searchForProductByNumberNameProductTypeOrStatus('abcd', '', '44', '0');
    expect(emptySearch.length).toBe(0);
  });

  it('search for product by status only', async () => {

    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );
    const product = await productUtility.getProductById(productVariant.productFk);
    
    const search = await productUtility.searchForProductByNumberNameProductTypeOrStatus('', '', '0', '1');
    expect(search.length).toBe(1);
    const result = search[0];
    expect(result.id).toBe(product.id);

    const emptySearch = await productUtility.searchForProductByNumberNameProductTypeOrStatus('', '', '0', '2');
    expect(emptySearch.length).toBe(0);
  })

  it('search for product by all options', async () => {

    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );
    const product = await productUtility.getProductById(productVariant.productFk);
    
    const search = await productUtility.searchForProductByNumberNameProductTypeOrStatus(product.productNumber, 
        product.name, calendarProductType.id, '1');
    expect(search.length).toBe(1);
    const result = search[0];
    expect(result.id).toBe(product.id);

    const emptySearch = await productUtility.searchForProductByNumberNameProductTypeOrStatus(product.productNumber, 
        product.name, calendarProductType.id, '2');
    expect(emptySearch.length).toBe(0);
  })
});
