const models = require('../../models');
const generalUtility = require('../../utility/general/generalUtility');
const schoolTestHelper = require('../helper/schoolTestHelper');
const classUtility = require('../../utility/class/classUtility');
const accountTestHelper = require('../helper/accountTestHelper');
const basketTestHelper = require('../helper/basketTestHelper');
const basketUtility = require('../../utility/basket/basketUtility');
const productUtility = require('../../utility/product/productUtility');
const { PRODUCT_TYPES } = require('../../utility/product/productTypes');
const { PURCHASE_BASKET_STATUS } = require('../../utility/basket/purchaseBasketStatus');
const { PRODUCT_VARIANT_TYPE, PRODUCT_VARIANT_TYPES_ID } = require('../../utility/product/productVariantTypes');
const { TEMPLATES } = require('../../utility/product/template');
var productVariantType;
var calendarProductType;

describe('class utility tests', () => {

    beforeEach(async () => {
        await generalUtility.pauseForTimeInSecond(0.01);
        await models.sequelize.sync({ force: true, logging: false });
        productVariantType = await productUtility.createProductVariantTypes(PRODUCT_VARIANT_TYPES_ID.PACKAGE, PRODUCT_VARIANT_TYPE.PACKAGE);
        calendarProductType = await productUtility.createProductType(PRODUCT_TYPES.CALENDARS);
    });

    afterAll(async () => {
        // Close the database connection after running tests
        await models.sequelize.close();
    });

    it('get class by number', async () => {

        const schoolDetails = await schoolTestHelper.createNewSchoolWithClass();
        const schoolClass = schoolDetails.class;

        const returnedClass = await classUtility.getClassByNumber(schoolClass.classNumber);

        expect(schoolClass.id).toBe(returnedClass.id);
    });

    it('get class details from school number', async () => {

        const schoolDetails = await schoolTestHelper.createNewSchoolWithClass();
        const school = schoolDetails.school;
        const schoolClass = schoolDetails.class;

        const classDetails = await classUtility.getClassDetailsFromSchoolNumber(school.schoolNumber);

        expect(classDetails.length).toBe(1);
        const classDetail = classDetails[0];
        expect(classDetail.id).toBe(schoolClass.id);
        expect(classDetail.kidTotal).toBe(0);
    });

    it('get class and school by class number', async () => {
        const schoolDetails = await schoolTestHelper.createNewSchoolWithClass();
        const school = schoolDetails.school;
        const schoolClass = schoolDetails.class;

        const classAndSchoolDetails = await classUtility.getClassAndSchoolByClassNumber(schoolClass.classNumber);
        expect(school.id).toBe(classAndSchoolDetails.schoolId);
        expect(schoolClass.id).toBe(classAndSchoolDetails.classId);
    });

    it('get all order item details for class id', async () => {

        const account = await accountTestHelper.createNewCustomerAccount();
        const schoolWithKidDetails = await schoolTestHelper.createNewSchoolWithKid();
        const schoolClass = schoolWithKidDetails.class;
        const kid = schoolWithKidDetails.kid;
        const basketItem = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_BLUE);
        const total = '33';
        const subtotal = '32';
        const deliveryPrice = '1';
        const deliveryName = 'Standard';
        const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, total, subtotal, deliveryPrice, deliveryName);
        await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);

        const allOrderItemDetailForClasses = await classUtility.getAllOrderItemDetailsForClassId(schoolClass.id);
        expect(allOrderItemDetailForClasses.length).toBe(1);

        const allOrderItemDetailForClass = allOrderItemDetailForClasses[0];
        expect(allOrderItemDetailForClass.id).toBe(basketItem.id);
        expect(allOrderItemDetailForClass.quantity).toBe(basketItem.quantity);
        expect(allOrderItemDetailForClass.cost).toBe(basketItem.cost);

        const productVariant = await productUtility.getProductVariantById(basketItem.productItemFk);
        expect(allOrderItemDetailForClass.name).toBe(productVariant.name);

        const productType = await productUtility.getProductTypeByProductVariantId(productVariant.id);
        expect(allOrderItemDetailForClass.type).toBe(productType.type);
    });

    it('get give back amount details for class by class Id', async () => {
        const account = await accountTestHelper.createNewCustomerAccount();
        const schoolWithKidDetails = await schoolTestHelper.createNewSchoolWithKid();
        const schoolClass = schoolWithKidDetails.class;
        const kid = schoolWithKidDetails.kid;
        const basketItem = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_BLUE);
        const total = '33';
        const subtotal = '32';
        const deliveryPrice = '1';
        const deliveryName = 'Standard';
        const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, total, subtotal, deliveryPrice, deliveryName);
        await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);

        const givebackAmountDetails = await classUtility.getGiveBackAmountDetailsForClassByClassId(schoolClass.id);
        const giveback = (basketItem.quantity * 0.4).toFixed(2);
        const cost = basketItem.cost * basketItem.quantity;

        expect(givebackAmountDetails.giveBackTotal).toBe(giveback);
        expect(givebackAmountDetails.photoPackQuantity).toBe("0");
        expect(givebackAmountDetails.photoPackGiveBack).toBe("0.00");
        expect(givebackAmountDetails.photoTotalCost).toBe("0.00");
        expect(givebackAmountDetails.standardPackGiveBack).toBe("0.00");
        expect(givebackAmountDetails.standardPackQuantity).toBe("0");
        expect(givebackAmountDetails.standardTotalCost).toBe("0.00");
        expect(givebackAmountDetails.calendarGiveBack).toBe(giveback);
        expect(givebackAmountDetails.calendarTotalCost).toBe(cost.toFixed(2));
        expect(givebackAmountDetails.calendarQuantity).toBe(basketItem.quantity.toString());
    })
});
