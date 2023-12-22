const models = require("../../models");

const fetch = require("node-fetch");
const generalUtility = require("../../utility/general/generalUtility");
const productItemUtility = require("../../utility/product/productItemUtility");
const productUtility = require("../../utility/product/productUtility");
const accountTestHelper = require("../helper/accountTestHelper");
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
    await generalUtility.deleteS3Folder("test/");
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

    const getProductItemById = await productItemUtility.getProductItemById(
      productItem.id
    );
    expect(getProductItemById.id).toBe(productItem.id);

    const getProductItemByNumber =
      await productItemUtility.getProductItemByNumber(
        productItem.productItemNumber
      );
    expect(getProductItemByNumber.id).toBe(productItem.id);
  });

  it("generate new product item number", async () => {
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

    const newProductItemNumber =
      await productItemUtility.getNewProductItemNumber();
    const getProductItem = await productItemUtility.getProductItemByNumber(
      newProductItemNumber
    );

    expect(getProductItem).toBe(null);
  });

  it("generate productItem Pdf", async () => {
    const productVariant =
      await productTestHelper.createProductVariantWithProductName(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234"
      );
    const productId = productVariant.productFk;

    const productVariants = await productUtility.getProductVariantsForProductId(
      productId
    );
    const productVariantItem = productVariants[0];
    const s3Path = await productItemUtility.generateProductItemPdf(
      [],
      productVariantItem
    );
    const response = await fetch(s3Path);
    expect(response.ok).toBe(true);
  }, 10000);

  it("create product item with no kid", async () => {
    const account = await accountTestHelper.createNewCustomerAccount();
    const productVariant =
      await productTestHelper.createProductVariantWithProductNameTextAndPictureCount(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234",
        0,
        2
      );
    const productItemGroup = await productItemUtility.createProductItemGroup();
    const productId = productVariant.productFk;

    const productVariants = await productUtility.getProductVariantsForProductId(
      productId
    );
    const productVariantItem = productVariants[0];
    const s3Path = "S3_Path";
    const picture1 = "picture1";
    const picture2 = "picture2";

    const data = {
      accountId: account.id,
      picture1: picture1,
      picture2: picture2,
    };
    const createdProductItemWithNoKid =
      await productItemUtility.createProductItemObjectNoKid(
        productVariantItem,
        data,
        s3Path,
        productItemGroup
      );
    const getProductItem = await productItemUtility.getProductItemById(
      createdProductItemWithNoKid.id
    );

    expect(getProductItem.kidFk).toBeNull();
    expect(getProductItem.productVariantFk).toBe(productVariant.id);
    expect(getProductItem.productItemGroupFk).toBe(productItemGroup.id);
    expect(getProductItem.pdfPath).toBe(s3Path);
    expect(getProductItem.accountFk).toBe(account.id);
    expect(getProductItem.picture1Path).toBe(picture1);
    expect(getProductItem.picture2Path).toBe(picture2);
    expect(getProductItem.displayItem1).toBe(false);
    expect(getProductItem.displayItem2).toBe(false);
    expect(getProductItem.displayItem3).toBe(false);
  });

  it("create product item object with kid id", async () => {
    const kidDetails = await schoolTestHelper.createNewSchoolWithKid();
    const school = kidDetails.school;
    const kid = kidDetails.kid;
    const schoolClass = kidDetails.class;
    const organiserAccount = kidDetails.organiserAccount;

    const productVariant =
      await productTestHelper.createProductVariantWithProductNameTextAndPictureCount(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        "1234",
        0,
        2
      );
    const productItemGroup = await productItemUtility.createProductItemGroup();
    const productId = productVariant.productFk;

    const productVariants = await productUtility.getProductVariantsForProductId(
      productId
    );
    const productVariantItem = productVariants[0];
    const s3Path = "S3_Path";
    const picture1 = "picture1";
    const picture2 = "picture2";

    const data = {
      accountId: organiserAccount.id,
      picture1: picture1,
      picture2: picture2,
      code: kid.code,
      name: kid.name,
      age: kid.age,
      month: kid.month,
      kidId: kid.id,
      school: school.name,
      class: schoolClass.name,
    };

    const createdProductItemWithKid =
      await productItemUtility.createProductItemObject(
        productVariantItem,
        data,
        kid,
        s3Path,
        productItemGroup
      );
    const getProductItem = await productItemUtility.getProductItemById(
      createdProductItemWithKid.id
    );

    expect(getProductItem.kidFk).toBe(kid.id);
    expect(getProductItem.productVariantFk).toBe(productVariant.id);
    expect(getProductItem.productItemGroupFk).toBe(productItemGroup.id);
    expect(getProductItem.pdfPath).toBe(s3Path);
    expect(getProductItem.accountFk).toBe(organiserAccount.id);
    expect(getProductItem.picture1Path).toBe(picture1);
    expect(getProductItem.picture2Path).toBe(picture2);
    expect(getProductItem.displayItem1).toBe(true);
    expect(getProductItem.displayItem2).toBe(true);
    expect(getProductItem.displayItem3).toBe(true);
    expect(getProductItem.text1).toBe(data.name);
    expect(getProductItem.text2).toBe(data.age.toString());
    expect(getProductItem.text3).toBe(data.month.toString());
    expect(getProductItem.text4).toBe(data.school);
    expect(getProductItem.text5).toBe(data.class);
  });

  it("set class for product item by product item group id", async () => {
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

    const schoolClassDetails =
      await schoolTestHelper.createNewSchoolWithClass();
    const schoolClass = schoolClassDetails.class;

    await productItemUtility.setClassForProductItemByProductItemGroupId(
      schoolClass.id,
      productItem.productItemGroupFk
    );

    const getProductItem = await productItemUtility.getProductItemById(
      productItem.id
    );

    expect(getProductItem.classFk).toBe(schoolClass.id);
  });

  it("get product items with product for kid and account", async () => {
    const { kid, organiserAccount } =
      await schoolTestHelper.createNewSchoolWithKid();

    const product = await productUtility.createProduct(
      calendarProductType.id,
      "productName",
      "",
      "",
      false,
      false
    );

    const productVariant1 =
      await productTestHelper.createProductVariantWithProductIdTextAndPictureCount(
        TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
        calendarProductType,
        productVariantType.id,
        1,
        product.id,
        0,
        2
      );
    const productVariant2 =
      await productTestHelper.createProductVariantWithProductIdTextAndPictureCount(
        TEMPLATES.CALENDAR_LANDSCAPE_GREEN,
        calendarProductType,
        productVariantType.id,
        1,
        product.id,
        0,
        2
      );

    const productItemGroup1 = await productItemUtility.createProductItemGroup();
    const productItemGroup2 = await productItemUtility.createProductItemGroup();

    const productItem1 =
      await productItemUtility.createProductItemByVariantAccountAndKid(
        productVariant1,
        productItemGroup1,
        organiserAccount,
        kid
      );
    const productItem2 =
      await productItemUtility.createProductItemByVariantAccountAndKid(
        productVariant2,
        productItemGroup2,
        organiserAccount,
        kid
      );

    const getProductItems =
      await productItemUtility.getProductItemsWithProductForKid(
        product.id,
        kid.id
      );

    expect(getProductItems.length).toBe(2);
    expect(getProductItems.map((pi) => pi.id)).toEqual([
      productItem1.id,
      productItem2.id,
    ]);

    const getProductItemsInCorrectKidId =
      await productItemUtility.getProductItemsWithProductForKid(product.id, 5);

    expect(getProductItemsInCorrectKidId.length).toBe(0);

    const getProductItemWithAccount =
      await productItemUtility.getProductItemsWithProductForAccount(
        product.id,
        organiserAccount.id,
        kid.id
      );

    expect(getProductItemWithAccount.length).toBe(2);
    expect(getProductItemWithAccount.map((pi) => pi.id)).toEqual([
      productItem1.id,
      productItem2.id,
    ]);

    const getProductItemWithAccountIncorrectAccountId =
      await productItemUtility.getProductItemsWithProductForAccount(
        product.id,
        5,
        kid.id
      );

    expect(getProductItemWithAccountIncorrectAccountId.length).toBe(0);
  });

  it("get default display options for kid where age and month are both not zero", () => {
    const { displayYears, displayMonths, displayBoth } =
      productItemUtility.getDefaultDisplayOptionsForKid(1, 5);

    expect(displayBoth).toBe("true");
    expect(displayMonths).toBe(undefined);
    expect(displayYears).toBe(undefined);
  });

  it("get default display options for kid where age is not zero only", () => {
    const { displayYears, displayMonths, displayBoth } =
      productItemUtility.getDefaultDisplayOptionsForKid(1, 0);

    expect(displayBoth).toBe(undefined);
    expect(displayMonths).toBe(undefined);
    expect(displayYears).toBe("true");
  });

  it("get default display options for kid where month is not zero only", () => {
    const { displayYears, displayMonths, displayBoth } =
      productItemUtility.getDefaultDisplayOptionsForKid(0, 9);

    expect(displayBoth).toBe(undefined);
    expect(displayMonths).toBe("true");
    expect(displayYears).toBe(undefined);
  });

  it("set pdfPath for productItem by id", async () => {
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

    const pdfPath = "new_pdf_path";

    await productItemUtility.setPdfPathForProductItemById(
      productItem.id,
      pdfPath
    );
    const updatedProductItem = await productItemUtility.getProductItemById(
      productItem.id
    );

    expect(updatedProductItem.pdfPath).toBe(pdfPath);
  });

  it("create product item group and get product item group by id", async () => {
    const productItemGroup = await productItemUtility.createProductItemGroup();
    const getProductItemGroup =
      await productItemUtility.getProductItemGroupById(productItemGroup.id);

    expect(getProductItemGroup.id).toBe(productItemGroup.id);
  });

  it("get product item with product for account and not with kid", async () => {
    const account = await accountTestHelper.createNewCustomerAccount();
    const product = await productUtility.createProduct(
      calendarProductType.id,
      "productName",
      "",
      "",
      false,
      false
    );

    await productTestHelper.createProductVariantWithProductIdTextAndPictureCount(
      TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
      calendarProductType,
      productVariantType.id,
      1,
      product.id,
      0,
      2
    );
    await productTestHelper.createProductVariantWithProductIdTextAndPictureCount(
      TEMPLATES.CALENDAR_LANDSCAPE_GREEN,
      calendarProductType,
      productVariantType.id,
      1,
      product.id,
      0,
      2
    );

    const productVariantItems =
      await productUtility.getProductVariantsForProductId(product.id);
    const productVariantItem1 = productVariantItems[0];
    const productVariantItem2 = productVariantItems[1];

    const productItemGroup1 = await productItemUtility.createProductItemGroup();
    const productItemGroup2 = await productItemUtility.createProductItemGroup();

    const data = {
      accountId: account.id,
      picture1: "picture1",
    };
    const s3Path = "s3Path";

    const productItem1 = await productItemUtility.createProductItemObjectNoKid(
      productVariantItem1,
      data,
      s3Path,
      productItemGroup1
    );
    const productItem2 = await productItemUtility.createProductItemObjectNoKid(
      productVariantItem2,
      data,
      s3Path,
      productItemGroup2
    );

    const getProductItems =
      await productItemUtility.getProductItemsWithProductForAccountAndNotWithKid(
        product.id,
        account.id
      );

    expect(getProductItems.length).toBe(2);
    expect(getProductItems.map((pi) => pi.id)).toEqual([
      productItem1.id,
      productItem2.id,
    ]);
  });

  it("get product item details by number", async () => {
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

    const getProductItemDetails =
      await productItemUtility.getProductItemDetailsByNumber(
        productItem.productItemNumber
      );
    expect(getProductItemDetails.id).toBe(productItem.id);
  });

  it("get product variant from product item id", async () => {
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

    const getProductVariant =
      await productItemUtility.getProductVariantForProductItemId(
        productItem.id
      );
    expect(getProductVariant.id).toBe(productItem.productVariantFk);
  });

  it("get template from product item id", async () => {
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

    const template = await productItemUtility.getTemplateFromProductItemId(
      productItem.id
    );

    expect(template.name).toBe(TEMPLATES.CALENDAR_LANDSCAPE_BLUE);
  });

  it("get product items for account number", async () => {
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

    const getProductItems =
      await productItemUtility.getProductItemsForAccountNumber(
        organiserAccount.accountNumber
      );
    expect(getProductItems.length).toBe(1);
    const getProductItem = getProductItems[0];
    expect(getProductItem.id).toBe(productItem.id);
  });

  it("get product items for kid code", async () => {
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

    const getProductItems =
      await productItemUtility.getProductItemsForKidNumber(
        kid.code
      );
    expect(getProductItems.length).toBe(1);
    const getProductItem = getProductItems[0];
    expect(getProductItem.id).toBe(productItem.id);
  });
});
