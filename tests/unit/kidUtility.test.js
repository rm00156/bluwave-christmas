const models = require("../../models");
const generalUtility = require("../../utility/general/generalUtility");
const schoolTestHelper = require("../helper/schoolTestHelper");
const productUtility = require("../../utility/product/productUtility");
const productItemTestHelper = require("../helper/productItemTestHelper");
const kidUtility = require("../../utility/kid/kidUtility");
const { TEMPLATES } = require("../../utility/product/template");
const { PRODUCT_TYPES } = require("../../utility/product/productTypes");
const {
    PRODUCT_VARIANT_TYPE,
    PRODUCT_VARIANT_TYPES_ID,
  } = require("../../utility/product/productVariantTypes");
let productVariantType;
let calendarProductType;


describe("kid utility tests", () => {
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

  it("create kid and get kid by id", async () => {
    const { kid } = await schoolTestHelper.createNewSchoolWithKid();
    const getKid = await kidUtility.getKidById(kid.id);

    expect(getKid.id).toBe(kid.id);
  });

  it("get kid by productItem id", async () => {
    const { kid, organiserAccount } = await schoolTestHelper.createNewSchoolWithKid();
    const productName = "Product_name";
    const productItem = await productItemTestHelper.generateProductItem(
      organiserAccount,
      kid,
      productVariantType.id,
      TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
      calendarProductType,
      productName
    );

    const getKid = await kidUtility.getKidByProductItemId(productItem.id);

    expect(getKid.id).toBe(kid.id);
  });

  it("add kid to class", async () => {
    const name = 'name';
    const age = 2;
    const months = 0;

    const schoolDetails = await schoolTestHelper.createNewSchoolWithClass();
    const schoolClass = schoolDetails.class;
    const account = schoolDetails.organiserAccount;

    const kid = await kidUtility.createKid(name, age, months, null, account.id);

    await kidUtility.addKidToClass(kid.id, schoolClass.id);

    const getKid = await kidUtility.getKidById(kid.id);

    expect(getKid.classFk).toBe(schoolClass.id);
  });

  it("get kid by code", async () => {
    const { kid } = await schoolTestHelper.createNewSchoolWithKid();
    
    const getKid = await kidUtility.getKidByCode(kid.code);

    expect(getKid.id).toBe(kid.id);
  });

  it("get new kid code", async () => {
    await schoolTestHelper.createNewSchoolWithKid();

    const newKidCode = await kidUtility.generateNewKidCode();

    const getKid = await kidUtility.getKidByCode(
      newKidCode
    );

    expect(getKid).toBe(null);
  });

  it('get kids class and school from kid id', async () => {
    const kidDetails = await schoolTestHelper.createNewSchoolWithKid();
    const school = kidDetails.school;
    const schoolClass = kidDetails.class;
    const kid = kidDetails.kid;

    const getClassAndSchoolFromKidId = await kidUtility.getKidClassAndSchoolFromKidId(kid.id);

    expect(getClassAndSchoolFromKidId.school).toBe(school.name);
    expect(getClassAndSchoolFromKidId.class).toBe(schoolClass.name);
  })

  it('get kids for product and account', async () => {
    const {kid, organiserAccount} = await schoolTestHelper.createNewSchoolWithKid();
    const productName = "Product_name";
    const productItem = await productItemTestHelper.generateProductItem(
      organiserAccount,
      kid,
      productVariantType.id,
      TEMPLATES.CALENDAR_LANDSCAPE_BLUE,
      calendarProductType,
      productName
    );

    const productVariant = await productUtility.getProductVariantById(productItem.productVariantFk)

    const kidsForProductAndAccount = await kidUtility.getKidsFromAccountIdAndProductId(organiserAccount.id, productVariant.productFk);
    expect(kidsForProductAndAccount.length).toBe(1);

    expect(kidsForProductAndAccount[0].id).toBe(kid.id);
  })

});
