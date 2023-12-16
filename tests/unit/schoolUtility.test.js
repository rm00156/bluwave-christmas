const models = require('../../models');

const schoolTestHelper = require('../helper/schoolTestHelper');
const productItemTestHelper = require('../helper/productItemTestHelper');
const schoolUtility = require('../../utility/school/schoolUtility');
const accountUtility = require('../../utility/account/accountUtility');
const generalUtility = require('../../utility/general/generalUtility');
const basketUtility = require('../../utility/basket/basketUtility');
const productItemUtility = require('../../utility/product/productItemUtility');
const productUtility = require('../../utility/product/productUtility');
const { TEMPLATES } = require('../../utility/product/template');
const { PRODUCT_VARIANT_TYPE, PRODUCT_VARIANT_TYPES_ID } = require('../../utility/product/productVariantTypes');
const { PRODUCT_TYPES, PRODUCT_TYPE_NAME } = require('../../utility/product/productTypes');

const { PURCHASE_BASKET_STATUS } = require('../../utility/basket/purchaseBasketStatus');

const STATUS_TYPES = require('../../utility/school/statusTypes');
const kidUtility = require('../../utility/kid/kidUtility');

const CLASS_NAME = 'Class';
const SCHOOL_NAME = 'School';
const SCHOOL_NUMBER = '12345677';
const SCHOOL_ADDRESS = 'Address Line 1';
const POST_CODE = 'POST CODE';
const SCHOOL_EMAIL = 'test@mail.com';
const EMAIL = 'test@hotmail.com';
const ACCOUNT_NUMBER = '1234567';
const PASSWORD = 'password';
const NAME = 'John Doe';
const telephone = '12345678912';
const ORGANISER_ACCOUNT_TYPE_ID = 3;
const yearId = 1;

describe('school utility tests', () => {
  beforeEach(async () => {
    await generalUtility.pauseForTimeInSecond(0.01);
    await models.sequelize.sync({ force: true, logging: false });

    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.REGISTERED, 'Registered', STATUS_TYPES.STATUS_TYPES_ID.DEADLINE_SET);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.DEADLINE_SET, 'Deadline Set', STATUS_TYPES.STATUS_TYPES_ID.ARTWORK_PACK_SENT);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.ARTWORK_PACK_SENT, 'Artwork Pack Sent to School', STATUS_TYPES.STATUS_TYPES_ID.PURCHASE_DEADLINE);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.PURCHASE_DEADLINE, 'Purchase Deadline', STATUS_TYPES.STATUS_TYPES_ID.WAITING_FOR_CUSTOMER_RESPONSE);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.WAITING_FOR_CUSTOMER_RESPONSE, 'Waiting for Customer Response', null);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.DELAY, 'Delay', STATUS_TYPES.STATUS_TYPES_ID.PRINTING);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.PRINTING, 'Printing', STATUS_TYPES.STATUS_TYPES_ID.PACKING_COMPLETE);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.PACKING_COMPLETE, 'Package Complete', STATUS_TYPES.STATUS_TYPES_ID.OUT_FOR_DELIVERY);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.OUT_FOR_DELIVERY, 'Out For Delivery', STATUS_TYPES.STATUS_TYPES_ID.WAITING_FOR_CHARITABLE_CONTRIBUTION_RESPONSE);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.WAITING_FOR_CHARITABLE_CONTRIBUTION_RESPONSE, 'Waiting for Charitiable Contribution Response', STATUS_TYPES.STATUS_TYPES_ID.CONFIRMED_CHARITABLE_CONTRIBUTION);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.CONFIRMED_CHARITABLE_CONTRIBUTION, 'Confirmed Charitable Contribution', STATUS_TYPES.STATUS_TYPES_ID.CONTRIBUTION_SENT);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.CONTRIBUTION_SENT, 'Contribution Sent', STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);
    await schoolUtility.createStatusType(STATUS_TYPES.STATUS_TYPES_ID.COMPLETE, 'Complete', null);
  });

  afterAll(async () => {
    // Close the database connection after running tests
    await models.sequelize.close();
  });

  it('create new class', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const createdClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    expect(createdClass.name).toBe(CLASS_NAME);
    expect(createdClass.schoolFk).toBe(school.id);
    expect(createdClass.yearFk).toBe(yearId);
    expect(createdClass.deleteFl).toBe(false);
    expect(createdClass.versionNo).toBe(1);
  });

  it('generate new class number', async () => {
    const newClassNumber = await schoolUtility.generateClassNumber();
    const schoolClass = await schoolUtility.getClassByNumber(newClassNumber);
    expect(schoolClass).toBeNull();
  });

  it('get class by class number returns correct class', async () => {
    const className = CLASS_NAME;
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const createdClass = await schoolUtility.createClass(className, school.id, yearId);

    const getClass = await schoolUtility.getClassByNumber(createdClass.classNumber);

    expect(createdClass.id).toBe(getClass.id);
    expect(createdClass.classNumber).toBe(getClass.classNumber);
    expect(createdClass.name).toBe(getClass.name);
  });

  it('set deleteFl for class to true', async () => {
    const className = CLASS_NAME;
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const createdClass = await schoolUtility.createClass(className, school.id, yearId);

    await schoolUtility.deleteClass(createdClass.id);

    const updatedClass = await schoolUtility.getClassByNumber(createdClass.classNumber);

    expect(createdClass.deleteFl).toBe(false);
    expect(updatedClass.deleteFl).toBe(true);
  });

  it('create new school by name', async () => {
    const accountDetail = {
      accountNumber: ACCOUNT_NUMBER + 9,
      email: `test9${EMAIL}`,
      hashPassword: PASSWORD,
      name: NAME,
      accountTypeId: ORGANISER_ACCOUNT_TYPE_ID,
      telephoneNumber: telephone,
      defaultPassword: true,
    };
    const account = await accountUtility.createAccount(accountDetail);
    const school = await schoolUtility.createSchool(
      SCHOOL_NAME + 2,
      SCHOOL_NUMBER + 2,
      SCHOOL_ADDRESS,
      POST_CODE,
      SCHOOL_NUMBER,
      SCHOOL_EMAIL,
      null,
      10,
      account.id,
    );

    expect(school.name).toBe(SCHOOL_NAME + 2);
    expect(school.schoolNumber).toBe(SCHOOL_NUMBER + 2);
    expect(school.address).toBe(SCHOOL_ADDRESS);
    expect(school.postCode).toBe(POST_CODE);
    expect(school.number).toBe(SCHOOL_NUMBER);
    expect(school.email).toBe(SCHOOL_EMAIL);
    expect(school.additionalInfo).toBeNull();
    expect(school.numberOfKidsPerClass).toBe(10);
    expect(school.organiserAccountFk).toBe(account.id);
    expect(school.deleteFl).toBe(false);
    expect(school.versionNo).toBe(1);
  });

  it('get school by id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const getSchool = await schoolUtility.getSchoolFromSchoolId(school.id);

    expect(school.id).toBe(getSchool.id);
  });

  it('update school details by id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const newName = 'updated_Name';
    const newAddress = 'updated_Address';
    const newPostCode = 'updated_PostCode';
    const newNumber = 'update_NewNumber';
    const newAdditionalInfo = 'update_AdditionalInfo';
    const newNumberOfKidsPerClass = 55;

    await schoolUtility.updateSchoolById(
      school.id,
      newName,
      newAddress,
      newPostCode,
      newNumber,
      newAdditionalInfo,
      newNumberOfKidsPerClass,
    );

    const updatedSchool = await schoolUtility.getSchoolFromSchoolId(school.id);
    expect(updatedSchool.name).toBe(newName);
    expect(updatedSchool.address).toBe(newAddress);
    expect(updatedSchool.postCode).toBe(newPostCode);
    expect(updatedSchool.number).toBe(newNumber);
    expect(updatedSchool.additionalInfo).toBe(newAdditionalInfo);
    expect(updatedSchool.numberOfKidsPerClass).toBe(newNumberOfKidsPerClass);
    expect(updatedSchool.deleteFl).toBe(false);
    expect(updatedSchool.versionNo).toBe(2);
  });

  it('get school by linked organiser account id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;

    const getSchool = await schoolUtility.getSchoolFromAccountId(account.id);

    expect(getSchool.id).toBe(school.id);
  });

  it('get all classes for school by id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const classes = new Array();
    for (let i = 0; i < 3; i++) {
      classes.push(await schoolUtility.createClass(`${CLASS_NAME}_${i}`, school.id, yearId));
    }

    const classIds = classes.map((schoolClass) => schoolClass.id);

    const schoolClasses = await schoolUtility.getClassesForSchoolId(school.id);

    const schoolClassIds = schoolClasses.map((schoolClass) => schoolClass.dataValues.id);
    expect(classIds).toEqual(schoolClassIds);
  });

  it('when class name for school already exists return true otherwise false', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const name = CLASS_NAME;
    await schoolUtility.createClass(name, school.id, yearId);

    const exists = await schoolUtility.isValidClassForSchool(school.id, name);
    expect(exists).toBe(false);

    const notExists = await schoolUtility.isValidClassForSchool(school.id, CLASS_NAME + 1);
    expect(notExists).toBe(true);
  });

  it('return school when provided the class id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const resultSchool = await schoolUtility.getSchoolFromClassId(schoolClass.id);

    expect(resultSchool.id).toEqual(school.id);
  });

  it('create deadline for school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const deadlineDttm = new Date();
    const verificationCode = '12435';
    const deadLine = await schoolUtility.createDeadlineForSchoolId(school.id, deadlineDttm, verificationCode);
    expect(deadLine.schoolFk).toBe(school.id);
    expect(deadLine.deadLineDttm).toBe(deadlineDttm);
    expect(deadLine.verificationCode).toBe(verificationCode);
  });

  it('get school deadline by school id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const deadlineDttm = new Date();
    const verificationCode = '12435';
    const deadLine = await schoolUtility.createDeadlineForSchoolId(school.id, deadlineDttm, verificationCode);

    const resultDeadline = await schoolUtility.getSchoolDeadlineBySchoolId(school.id);

    expect(deadLine.id).toEqual(resultDeadline.id);
  });

  it('generate new verification code', async () => {
    const newVerificationCode = await schoolUtility.createVerificationCodeForDeadline();
    const deadline = await schoolUtility.getSchoolDeadlineByVerificationCode(newVerificationCode);
    expect(deadline).toBeNull();
  });

  it('return kids who are linked with any school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;

    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kids = new Array();
    for (let i = 0; i < 5; i++) {
      kids.push(await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id));
    }

    const numberOfKidsLinkedToEachSchool = await schoolUtility.getNumberOfKidsLinkedToEachSchool();

    expect(kids.length).toBe(numberOfKidsLinkedToEachSchool[0].totalKids);
  });

  it('create new status for a school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.REGISTERED);

    const status = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.REGISTERED);

    expect(status.schoolFk).toBe(school.id);
    expect(status.statusTypeFk).toBe(STATUS_TYPES.STATUS_TYPES_ID.REGISTERED);
  });

  it('get deadline details from date where month is less 10', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const date = new Date(2023, 3, 5);
    const deadline = await schoolUtility.createDeadlineForSchoolId(school.id, date, 'abcdefgh');
    const deadlineDetail = schoolUtility.getDeadlineDetails(deadline);

    expect(deadlineDetail.deadLineDttm).toBe('2023-04-05');
  });

  it('get deadline details from date where month is greater or equal 10', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const date = new Date(2023, 10, 5);
    const deadline = await schoolUtility.createDeadlineForSchoolId(school.id, date, 'abcdefgh');
    const deadlineDetail = schoolUtility.getDeadlineDetails(deadline);

    expect(deadlineDetail.deadLineDttm).toBe('2023-11-05');
  });

  it('get deadline details from date in the past', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const deadline = await schoolUtility.createDeadlineForSchoolId(school.id, date, 'abcdefgh');
    const deadlineDetail = schoolUtility.getDeadlineDetails(deadline);

    expect(deadlineDetail.daysLeftSign).toBe('negative');
    expect(deadlineDetail.daysLeft).toBe(-1);
  });

  it('get deadline details from date in the future', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const deadline = await schoolUtility.createDeadlineForSchoolId(school.id, date, 'abcdefgh');
    const deadlineDetail = schoolUtility.getDeadlineDetails(deadline);

    expect(deadlineDetail.daysLeftSign).toBe('postive');
    expect(deadlineDetail.daysLeft).toBe(1);
  });

  it('get deadline details from date which is today', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const date = new Date();
    const deadline = await schoolUtility.createDeadlineForSchoolId(school.id, date, 'abcdefgh');
    const deadlineDetail = schoolUtility.getDeadlineDetails(deadline);

    expect(deadlineDetail.daysLeftSign).toBe('zero');
  });

  it('get the current status of school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.REGISTERED);
    await generalUtility.pauseForTimeInSecond(1);
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.ARTWORK_PACK_SENT);
    await generalUtility.pauseForTimeInSecond(1);
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.PRINTING);

    const currentSchoolStatusDetails = await schoolUtility.getCurrentSchoolsStatusDetailsBySchoolId(school.id);

    expect(currentSchoolStatusDetails[0].statusTypeId).toBe(STATUS_TYPES.STATUS_TYPES_ID.PRINTING);
  });

  it('return empty list when no give back actions required for any school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.REGISTERED);
    const schoolsRequiring = await schoolUtility.getSchoolsRequiringGiveBackAction();
    expect(schoolsRequiring.length).toBe(0);
  });

  it('create charity amount for school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const charityAmount = await schoolUtility.createCharityAmount(school.id, '100');

    const returnCharityAmount = await schoolUtility.getCharityAmount(school.id);

    expect(charityAmount.id).toBe(returnCharityAmount.id);
    expect(charityAmount.amount).toBe(returnCharityAmount.amount);
    expect(charityAmount.schoolFk).toBe(returnCharityAmount.schoolFk);
  });

  it('get next status types for status type where next step is null current status is delay', async () => {
    const nextStatusTypes = await schoolUtility.getNextStepsForStatusType(null, STATUS_TYPES.STATUS_TYPES_ID.DELAY);
    const expectedStatusTypesIds = [STATUS_TYPES.STATUS_TYPES_ID.PRINTING, STATUS_TYPES.STATUS_TYPES_ID.PACKING_COMPLETE];

    expect(expectedStatusTypesIds).toEqual(nextStatusTypes.map((o) => o.id));
  });

  it('get next status types for status type where next step is null and current is not delay', async () => {
    const nextStatusTypes = await schoolUtility.getNextStepsForStatusType(null, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);
    const expectedStatusTypesIds = [];

    expect(expectedStatusTypesIds).toEqual(nextStatusTypes.map((o) => o.id));
  });

  it('get next status types for status type where next step is not null', async () => {
    const nextStatusTypes = await schoolUtility.getNextStepsForStatusType(STATUS_TYPES.STATUS_TYPES_ID.DEADLINE_SET);
    const expectedStatusTypesIds = [STATUS_TYPES.STATUS_TYPES_ID.DEADLINE_SET];

    expect(expectedStatusTypesIds).toEqual(nextStatusTypes.map((o) => o.id));
  });

  it('return kids who are linked with school by school id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;
    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kids = new Array();
    for (let j = 0; j < 5; j++) {
      kids.push(await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id));
    }

    const kidsLinkedToSchool = await schoolUtility.getAllKidsFromSchoolId(school.id);

    expect(kids.map((o) => o.id)).toEqual(kidsLinkedToSchool.map((o) => o.id));
  });

  it('get school by school number', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const returnSchool = await schoolUtility.getSchoolFromSchoolNumber(school.schoolNumber);

    expect(school.id).toEqual(returnSchool.id);
  });

  it('get order details for all kids from a school by id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;

    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kid = await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);
    await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);

    const template = await productUtility.createTemplate(TEMPLATES.CHRISTMAS_SCHEME_CARD, '', '', '', 1, 1, '');
    const productVariantType = await productUtility.createProductVariantTypes(PRODUCT_VARIANT_TYPES_ID.PACKAGE, PRODUCT_VARIANT_TYPE.PACKAGE);
    const product = await productUtility.createProduct(1, '4', '', '', false, false);
    const productVariant = await productUtility.createProductVariant('Standard', 1, product.id, productVariantType.id, '22', template.id, '');

    const productItemGroup = await productItemUtility.createProductItemGroup();
    const productItemNumber = await productItemUtility.getNewProductItemNumber();
    const object = {
      productItemNumber,
      productVariantFk: productVariant.id,
      productItemGroupFk: productItemGroup.id,
      pdfPath: 's3Path',
      displayItem1: false,
      displayItem2: false,
      displayItem3: false,
      accountFk: account.id,
      kidFk: kid.id,
      classFk: kid.classFk,
      deleteFl: false,
      versionNo: 1,
    };
    const productItem = await productItemUtility.createProductItem(object);
    const basketItem = await basketUtility.createBasketItem(account.id, '', productItem.id, '', '', 1, '2', '', false, false, false);
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, 2, 2, '', '', null);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);
    const orderDetailsForAllKidsFromSchool = await schoolUtility.getOrderDetailsForAllKidsFromSchoolId(school.id);

    expect(orderDetailsForAllKidsFromSchool.orderCount).toBe(1);
    expect(orderDetailsForAllKidsFromSchool.totalKids).toBe(2);
  });

  it('confirm charity amount is updated correctly', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const newAmount = '88';
    const charityAmount = await schoolUtility.createCharityAmount(school.id, 55);
    await schoolUtility.resetCharityAmount(newAmount, charityAmount.id);

    const returnCharityAmount = await schoolUtility.getCharityAmount(school.id);
    expect(returnCharityAmount.amount).toBe(newAmount);
  });

  it('confirm charity amount for school by id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    await schoolUtility.createCharityAmount(school.id, 55);
    await schoolUtility.confirmCharityAmountBySchoolId(school.id);
    const charityAmount = await schoolUtility.getCharityAmount(school.id);

    expect(charityAmount.confirmedFl).toBe(true);
  });

  it('return schools requiring give back actions', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.CONFIRMED_CHARITABLE_CONTRIBUTION);
    await schoolUtility.createCharityAmount(school.id, 55);
    await schoolUtility.confirmCharityAmountBySchoolId(school.id);

    const schoolsRequiring = await schoolUtility.getSchoolsRequiringGiveBackAction();
    expect(schoolsRequiring[0].name).toBe(school.name);
  });

  it('get number of schools signed up', async () => {
    for (let i = 29; i < 32; i++) {
      await schoolTestHelper.createNewSchoolWithAccount();
    }

    const numberOfSchools = await schoolUtility.getNumberOfSchools();
    expect(numberOfSchools).toBe(3);
  });

  it('get school linked to basketItem by id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;

    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kid = await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);
    await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);

    const template = await productUtility.createTemplate(TEMPLATES.CHRISTMAS_SCHEME_CARD, '', '', '', 1, 1, '');
    const productVariantType = await productUtility.createProductVariantTypes(PRODUCT_VARIANT_TYPES_ID.PACKAGE, PRODUCT_VARIANT_TYPE.PACKAGE);
    const product = await productUtility.createProduct(1, '4', '', '', false, false);
    const productVariant = await productUtility.createProductVariant('Standard', 1, product.id, productVariantType.id, '22', template.id, '');

    const productItemGroup = await productItemUtility.createProductItemGroup();
    const productItemNumber = await productItemUtility.getNewProductItemNumber();
    const object = {
      productItemNumber,
      productVariantFk: productVariant.id,
      productItemGroupFk: productItemGroup.id,
      pdfPath: 's3Path',
      displayItem1: false,
      displayItem2: false,
      displayItem3: false,
      accountFk: account.id,
      kidFk: kid.id,
      classFk: kid.classFk,
      deleteFl: false,
      versionNo: 1,
    };
    const productItem = await productItemUtility.createProductItem(object);
    const basketItem = await basketUtility.createBasketItem(account.id, '', productItem.id, '', '', 1, '2', '', false, false, false);

    const schoolFromBasketItem = await schoolUtility.getSchoolFromBasketItemId(basketItem.id);
    expect(school.id).toBe(schoolFromBasketItem.id);
  });

  it('if no deadline return null when getting deadline by classId', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const deadline = await schoolUtility.getSchoolDeadlineBySchoolId(schoolClass.id);

    expect(deadline).toBeNull();
  });

  it('return deadline when getting deadline by classId', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);
    const deadline = await schoolUtility.createDeadlineForSchoolId(school.id, Date.now(), 'verification_code');

    const deadlineByClassId = await schoolUtility.getSchoolDeadlineFromClassId(schoolClass.id);

    expect(deadline.id).toBe(deadlineByClassId.id);
  });

  it('get classes with orders', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;
    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kid = await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);
    await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);

    const template = await productUtility.createTemplate(TEMPLATES.CHRISTMAS_SCHEME_CARD, '', '', '', 1, 1, '');
    const productVariantType = await productUtility.createProductVariantTypes(PRODUCT_VARIANT_TYPES_ID.PACKAGE, PRODUCT_VARIANT_TYPE.PACKAGE);
    const product = await productUtility.createProduct(1, '4', '', '', false, false);
    const productVariant = await productUtility.createProductVariant('Standard', 1, product.id, productVariantType.id, '22', template.id, '');

    const productItemGroup = await productItemUtility.createProductItemGroup();
    const productItemNumber = await productItemUtility.getNewProductItemNumber();
    const object = {
      productItemNumber,
      productVariantFk: productVariant.id,
      productItemGroupFk: productItemGroup.id,
      pdfPath: 's3Path',
      displayItem1: false,
      displayItem2: false,
      displayItem3: false,
      accountFk: account.id,
      kidFk: kid.id,
      classFk: kid.classFk,
      deleteFl: false,
      versionNo: 1,
    };
    const productItem = await productItemUtility.createProductItem(object);
    const basketItem = await basketUtility.createBasketItem(account.id, '', productItem.id, '', '', 5, '2', '', false, false, false);
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, 2, 2, '', '', null);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);

    const returnClasses = await schoolUtility.getClassesWithOrdersBySchoolId(school.id);

    expect(returnClasses.length).toBe(1);
    expect(returnClasses[0].id).toBe(schoolClass.id);
  });

  it('get breakdown for standard pack per class by school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;

    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kid = await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);
    await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);

    const template = await productUtility.createTemplate(TEMPLATES.CHRISTMAS_SCHEME_CARD, '', '', '', 1, 1, '');
    const productVariantType = await productUtility.createProductVariantTypes(PRODUCT_VARIANT_TYPES_ID.PACKAGE, PRODUCT_VARIANT_TYPE.PACKAGE);
    const productType = await productUtility.createProductType(PRODUCT_TYPES.CHRISTMAS_CARDS);
    const product = await productUtility.createProduct(productType.id, '4', '', '', false, false);
    const productVariant = await productUtility.createProductVariant(PRODUCT_TYPE_NAME.STANDARD_PACK, 1, product.id, productVariantType.id, '22', template.id, '');

    const productItemGroup = await productItemUtility.createProductItemGroup();
    const productItemNumber = await productItemUtility.getNewProductItemNumber();
    const object = {
      productItemNumber,
      productVariantFk: productVariant.id,
      productItemGroupFk: productItemGroup.id,
      pdfPath: 's3Path',
      displayItem1: false,
      displayItem2: false,
      displayItem3: false,
      accountFk: account.id,
      kidFk: kid.id,
      classFk: kid.classFk,
      deleteFl: false,
      versionNo: 1,
    };
    const productItem = await productItemUtility.createProductItem(object);
    const quantity = 5;
    const basketItem = await basketUtility.createBasketItem(account.id, '', productItem.id, '', '', quantity, '2', '', false, false, false);
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, 2, 2, '', '', null);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);

    const givebackBreakdown = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
    const standardPackGiveBackPer = 0.7;
    const zero = '0.00';
    const giveBack = (quantity * standardPackGiveBackPer).toFixed(2);
    const { classesData } = givebackBreakdown;
    expect(classesData.length).toBe(1);

    const classData = classesData[0];
    expect(classData.standardPackGiveBack).toBe(giveBack);
    expect(classData.giveBackTotal).toBe(giveBack);
    expect(classData.standardPackQuantity).toBe(quantity.toString());
    expect(classData.name).toBe(schoolClass.name);
    expect(givebackBreakdown.totalGiveBackAmount).toBe(giveBack);
    expect(classData.photoPackGiveBack).toBe(zero);
    expect(classData.photoPackQuantity).toBe('0');
    expect(classData.calendarGiveBack).toBe(zero);
    expect(classData.calendarQuantity).toBe('0');
  });

  it('get breakdown for photo pack per class by school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;

    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kid = await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);
    await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);

    const template = await productUtility.createTemplate(TEMPLATES.CHRISTMAS_SCHEME_CARD, '', '', '', 1, 1, '');
    const productVariantType = await productUtility.createProductVariantTypes(PRODUCT_VARIANT_TYPES_ID.PACKAGE, PRODUCT_VARIANT_TYPE.PACKAGE);
    const productType = await productUtility.createProductType(PRODUCT_TYPES.CHRISTMAS_CARDS);
    const product = await productUtility.createProduct(productType.id, '4', '', '', false, false);
    const productVariant = await productUtility.createProductVariant(PRODUCT_TYPE_NAME.PHOTO_PACK, 1, product.id, productVariantType.id, '22', template.id, '');

    const productItemGroup = await productItemUtility.createProductItemGroup();
    const productItemNumber = await productItemUtility.getNewProductItemNumber();
    const object = {
      productItemNumber,
      productVariantFk: productVariant.id,
      productItemGroupFk: productItemGroup.id,
      pdfPath: 's3Path',
      displayItem1: false,
      displayItem2: false,
      displayItem3: false,
      accountFk: account.id,
      kidFk: kid.id,
      classFk: kid.classFk,
      deleteFl: false,
      versionNo: 1,
    };
    const productItem = await productItemUtility.createProductItem(object);
    const quantity = 8;
    const basketItem = await basketUtility.createBasketItem(account.id, '', productItem.id, '', '', quantity, '2', '', false, false, false);
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, 2, 2, '', '', null);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);

    const givebackBreakdown = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
    const photoPackGiveBackPer = 0.8;
    const zero = '0.00';
    const giveBack = (quantity * photoPackGiveBackPer).toFixed(2);
    const { classesData } = givebackBreakdown;
    expect(classesData.length).toBe(1);

    const classData = classesData[0];
    expect(classData.standardPackGiveBack).toBe(zero);
    expect(classData.giveBackTotal).toBe(giveBack);
    expect(classData.standardPackQuantity).toBe('0');
    expect(classData.name).toBe(schoolClass.name);
    expect(givebackBreakdown.totalGiveBackAmount).toBe(giveBack);
    expect(classData.photoPackGiveBack).toBe(giveBack);
    expect(classData.photoPackQuantity).toBe(quantity.toString());
    expect(classData.calendarGiveBack).toBe(zero);
    expect(classData.calendarQuantity).toBe('0');
  });

  it('get breakdown for calendars per class by school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;

    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kid = await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);
    await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);
    const productVariantType = await productUtility.createProductVariantTypes(PRODUCT_VARIANT_TYPES_ID.PACKAGE, PRODUCT_VARIANT_TYPE.PACKAGE);
    const calendarProductType = await productUtility.createProductType(PRODUCT_TYPES.CALENDARS);

    const productItem = await productItemTestHelper.generateProductItem(account, kid, productVariantType.id, TEMPLATES.CALENDAR_LANDSCAPE_BLUE, calendarProductType, '1234');
    const quantity = 8;
    const basketItem = await basketUtility.createBasketItem(account.id, '', productItem.id, '', '', quantity, '2', '', false, false, false);
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, 2, 2, '', '', null);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);

    const givebackBreakdown = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
    const calendarGiveBackPer = 0.4;
    const zero = '0.00';
    const giveBack = (quantity * calendarGiveBackPer).toFixed(2);
    const { classesData } = givebackBreakdown;
    expect(classesData.length).toBe(1);

    const classData = classesData[0];
    expect(classData.standardPackGiveBack).toBe(zero);
    expect(classData.giveBackTotal).toBe(giveBack);
    expect(classData.standardPackQuantity).toBe('0');
    expect(classData.name).toBe(schoolClass.name);
    expect(givebackBreakdown.totalGiveBackAmount).toBe(giveBack);
    expect(classData.photoPackGiveBack).toBe(zero);
    expect(classData.photoPackQuantity).toBe('0');
    expect(classData.calendarGiveBack).toBe(giveBack);
    expect(classData.calendarQuantity).toBe(quantity.toString());
  });

  it('delay a deadline for a school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const deadlineDttm = new Date();
    const verificationCode = '12435';
    await schoolUtility.createDeadlineForSchoolId(school.id, deadlineDttm, verificationCode);
    await schoolUtility.delayDeadlineForSchoolId(school.id);
    const deadline = await schoolUtility.getSchoolDeadlineBySchoolId(school.id);

    expect(deadline.continueFl).toBe(false);
    expect(deadline.delayFl).toBe(true);
  });

  it('return true when school has had status printing', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.PRINTING);
    const isSchoolStartedPrintingOrBeenDelayed = await schoolUtility.hasSchoolStartedPrintingOrBeenDelayed(school.id);
    expect(isSchoolStartedPrintingOrBeenDelayed).toBe(true);
  });

  it('return true when school has had status delay', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.DELAY);
    const isSchoolStartedPrintingOrBeenDelayed = await schoolUtility.hasSchoolStartedPrintingOrBeenDelayed(school.id);
    expect(isSchoolStartedPrintingOrBeenDelayed).toBe(true);
  });

  it('return false when school has not had status delay or printing', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const isSchoolStartedPrintingOrBeenDelayed = await schoolUtility.hasSchoolStartedPrintingOrBeenDelayed(school.id);
    expect(isSchoolStartedPrintingOrBeenDelayed).toBe(false);
  });

  it('reset the deadline dttm for a school', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    const deadlineDttm = new Date();
    const verificationCode = '12435';
    await schoolUtility.createDeadlineForSchoolId(school.id, deadlineDttm, verificationCode);
    const newDate = new Date(2023, 4, 20);
    await schoolUtility.resetDeadlineDttmForSchoolId(school.id, newDate);

    const deadline = await schoolUtility.getDeadlineDetailsForSchoolId(school.id);
    expect(deadline.deadLineDttm).toBe('2023-05-20');
  });

  it('get all deadlines ', async () => {
    for (let i = 0; i < 3; i++) {
      const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
      const { school } = schoolAccount;

      const deadlineDttm = new Date();
      const verificationCode = `12435${i}`;
      await schoolUtility.createDeadlineForSchoolId(school.id, deadlineDttm, verificationCode);
    }

    const deadlines = await schoolUtility.getAllDeadlines();
    expect(deadlines.length).toBe(3);
  });

  it('get the givebackamount and details for a school by id', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;

    const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, yearId);

    const kid = await kidUtility.createKid('John', 1, 0, schoolClass.id, account.id);
    const productVariantType = await productUtility.createProductVariantTypes(PRODUCT_VARIANT_TYPES_ID.PACKAGE, PRODUCT_VARIANT_TYPE.PACKAGE);
    const calendarProductType = await productUtility.createProductType(PRODUCT_TYPES.CALENDARS);
    const photoPackProductType = await productUtility.createProductType(PRODUCT_TYPE_NAME.PHOTO_PACK);
    const standardPackProductType = await productUtility.createProductType(PRODUCT_TYPE_NAME.STANDARD_PACK);
    const calendarProductItem = await productItemTestHelper.generateProductItem(account, kid, productVariantType.id, TEMPLATES.CALENDAR_LANDSCAPE_BLUE, calendarProductType, '1234');
    const photoPackProductItem = await productItemTestHelper.generateProductItem(account, kid, productVariantType.id, TEMPLATES.CHRISTMAS_SCHEME_CARD_PICTURE, photoPackProductType, '12345');
    const standardPackProductItem = await productItemTestHelper.generateProductItem(account, kid, productVariantType.id, TEMPLATES.CHRISTMAS_SCHEME_CARD, standardPackProductType, '12346');

    const calendarQuantity = 10;
    const calendarBasketItem = await basketUtility.createBasketItem(account.id, '', calendarProductItem.id, '', '', calendarQuantity, '2', '', false, false, false);
    const photoPackQuantity = 10;
    const photoPackBasketItem = await basketUtility.createBasketItem(account.id, '', photoPackProductItem.id, '', '', photoPackQuantity, '2', '', false, false, false);
    const standardPackQuantity = 10;
    const standardPackBasketItem = await basketUtility.createBasketItem(account.id, '', standardPackProductItem.id, '', '', standardPackQuantity, '2', '', false, false, false);

    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, 2, 2, '', '', null);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [photoPackBasketItem.id, calendarBasketItem.id, standardPackBasketItem.id]);

    const expectedGiveBack = (calendarQuantity * 0.4) + (photoPackQuantity * 0.8) + (standardPackQuantity * 0.7);

    const giveBackAmount = await schoolUtility.getGiveBackAmount(school.id);
    expect(giveBackAmount.giveBackTotal).toBe(expectedGiveBack.toFixed(2));

    const giveBackAmountDetailsForSchools = await schoolUtility.getGiveBackAmountDetailsForEachSchool();
    expect(giveBackAmountDetailsForSchools.length).toBe(1);
    const giveBackAmountDetailsForSchool = giveBackAmountDetailsForSchools[0];

    expect(giveBackAmountDetailsForSchool.school).toBe(school.name);
    expect(giveBackAmountDetailsForSchool.schoolNumber).toBe(school.schoolNumber);
    expect(giveBackAmountDetailsForSchool.action).toBe(false);
    expect(giveBackAmountDetailsForSchool.giveBackTotal).toBe(expectedGiveBack.toFixed(2));
  });

  it('get school progress details', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;

    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.REGISTERED);

    const schoolProgressDetails = await schoolUtility.getSchoolProgressDetails();
    expect(schoolProgressDetails.length).toBe(1);

    const schoolProgressDetail = schoolProgressDetails[0];
    expect(schoolProgressDetail.name).toBe(school.name);
    expect(schoolProgressDetail.schoolNumber).toBe(school.schoolNumber);
    const percentage = (1 / 13) * 100;
    expect(parseFloat(schoolProgressDetail.percentage).toFixed(2)).toBe(percentage.toFixed(2));
  });

  it('get schools with current status complete and get school dashboard status', async () => {
    const schoolAccount1 = await schoolTestHelper.createNewSchoolWithAccount();
    const school1 = schoolAccount1.school;

    const schoolAccount2 = await schoolTestHelper.createNewSchoolWithAccount();
    const school2 = schoolAccount2.school;

    await schoolTestHelper.createNewSchoolWithAccount();
    await schoolUtility.createNewStatusForSchoolId(school1.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);
    await schoolUtility.createNewStatusForSchoolId(school2.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const schoolsWithCurrentStatusComplete = await schoolUtility.getSchoolsWithCurrentStatusComplete();
    expect(schoolsWithCurrentStatusComplete.length).toBe(2);

    const schoolDashboardStatus = await schoolUtility.getSchoolDashboardStatus();
    const completedPercentage = ((2 / 3) * 100).toFixed(0);
    expect(schoolDashboardStatus.numberOfCompleted).toBe(2);
    expect(schoolDashboardStatus.numberOfNonCompleted).toBe(1);
    expect(schoolDashboardStatus.numberOfCompletedPercentage).toBe(completedPercentage);
    expect(schoolDashboardStatus.numberOfNonCompletedPercentage).toBe((100 - completedPercentage).toString());
  });

  it('search for school by name only where no result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('abcd', '', '', '', '');
    expect(searchResults.length).toBe(0);
  });

  it('search for school by name only where result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('ool', '', '', '', '');
    expect(searchResults.length).toBe(1);

    const searchResult = searchResults[0];
    expect(searchResult.name).toBe(school.name);
  });

  it('search for school by address only where no result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('', 'abcd', '', '', '');
    expect(searchResults.length).toBe(0);
  });

  it('search for school by address only where result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('', 'addre', '', '', '');
    expect(searchResults.length).toBe(1);

    const searchResult = searchResults[0];
    expect(searchResult.name).toBe(school.name);
  });

  it('search for school by post code only where no result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('', '', 'abcd', '', '');
    expect(searchResults.length).toBe(0);
  });

  it('search for school by post code only where result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('', '', 'cod', '', '');
    expect(searchResults.length).toBe(1);

    const searchResult = searchResults[0];
    expect(searchResult.name).toBe(school.name);
  });

  it('search for school by status only where no result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('', '', '', STATUS_TYPES.STATUS_TYPES.ARTWORK_PACK_SENT, '');
    expect(searchResults.length).toBe(0);
  });

  it('search for school by status only where result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('', '', '', STATUS_TYPES.STATUS_TYPES.COMPLETE, '');
    expect(searchResults.length).toBe(1);

    const searchResult = searchResults[0];
    expect(searchResult.name).toBe(school.name);
  });

  it('search for school by email only where no result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('', '', '', '', 'email');
    expect(searchResults.length).toBe(0);
  });

  it('search for school by status only where result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('', '', '', '', 'test');
    expect(searchResults.length).toBe(1);

    const searchResult = searchResults[0];
    expect(searchResult.name).toBe(school.name);
  });

  it('search for school by all options only where result should be found', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const searchResults = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail('sch', 'add', 'pos', STATUS_TYPES.STATUS_TYPES.COMPLETE, 'test');
    expect(searchResults.length).toBe(1);

    const searchResult = searchResults[0];
    expect(searchResult.name).toBe(school.name);
  });

  it('get school details by school number', async () => {
    const schoolAccount = await schoolTestHelper.createNewSchoolWithAccount();
    const { school } = schoolAccount;
    const account = schoolAccount.organiserAccount;
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);

    const schoolDetails = await schoolUtility.getSchoolDetailsBySchoolNumber(school.schoolNumber);

    expect(schoolDetails.name).toBe(school.name);
    expect(schoolDetails.type).toBe(STATUS_TYPES.STATUS_TYPES.COMPLETE);
    expect(schoolDetails.accountNumber).toBe(account.accountNumber);
    expect(schoolDetails.email).toBe(account.email);
  });

  it('get schools with name and post code', async () => {

    const { school } = await schoolTestHelper.createNewSchoolWithAccount();
    const name = school.name;
    const postCode = school.postCode;

    const getSchool = await schoolUtility.getSchoolWithNameAndPostCode(name, postCode);

    expect(getSchool.id).toBe(school.id);
  })
});
