const models = require('../../models');
const accountTestHelper = require('../helper/accountTestHelper');
const schoolTestHelper = require('../helper/schoolTestHelper');
const generalUtility = require('../../utility/general/generalUtility');
const basketTestHelper = require('../helper/basketTestHelper');
const basketUtility = require('../../utility/basket/basketUtility');
const productUtility = require('../../utility/product/productUtility');
const { PRODUCT_TYPES } = require('../../utility/product/productTypes');
const { PURCHASE_BASKET_STATUS } = require('../../utility/basket/purchaseBasketStatus');
const { PRODUCT_VARIANT_TYPE, PRODUCT_VARIANT_TYPES_ID } = require('../../utility/product/productVariantTypes');
const { TEMPLATES } = require('../../utility/product/template');

let productVariantType;
let calendarProductType;

describe('basket utility tests', () => {
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

  it('create basket item for account id and get basket item by id', async () => {
    const account = await accountTestHelper.createNewCustomerAccount();
    const schoolWithKidDetails = await schoolTestHelper.createNewSchoolWithKid();

    const { kid } = schoolWithKidDetails;
    const basketItem = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_BLUE);
    const returnedBasketItem = await basketUtility.getBasketItemById(basketItem.id);

    expect(returnedBasketItem.id).toEqual(basketItem.id);
  });

  it('create purchase basket and get purchasebasket by id', async () => {
    const total = '33';
    const subtotal = '32';
    const deliveryPrice = '1';
    const deliveryName = 'Standard';
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, total, subtotal, deliveryPrice, deliveryName);

    const returnedPurchaseBasket = await basketUtility.getPurchaseBasketById(purchaseBasket.id);

    expect(purchaseBasket.id).toBe(returnedPurchaseBasket.id);
  });

  it('set basket items for purchase basket by id', async () => {
    const account = await accountTestHelper.createNewCustomerAccount();
    const schoolWithKidDetails = await schoolTestHelper.createNewSchoolWithKid();

    const { kid } = schoolWithKidDetails;
    const total = '33';
    const subtotal = '32';
    const deliveryPrice = '1';
    const deliveryName = 'Standard';
    const basketItem1 = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_BLUE);
    const basketItem2 = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_GREEN);
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.COMPLETED, total, subtotal, deliveryPrice, deliveryName);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem1.id, basketItem2.id]);

    const returnedBasketItem1 = await basketUtility.getBasketItemById(basketItem1.id);
    const returnedBasketItem2 = await basketUtility.getBasketItemById(basketItem2.id);

    expect(returnedBasketItem1.purchaseBasketFk).toBe(purchaseBasket.id);
    expect(returnedBasketItem2.purchaseBasketFk).toBe(purchaseBasket.id);
  });

  it('get current basket items with no purchase basket for account', async () => {
    const account = await accountTestHelper.createNewCustomerAccount();
    const schoolWithKidDetails = await schoolTestHelper.createNewSchoolWithKid();

    const { kid } = schoolWithKidDetails;
    const basketItem = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_BLUE);

    const currentBasketItems = await basketUtility.getCurrentBasketItemsDetailsNoPurchaseBasketForAccountId(account.id);
    expect(currentBasketItems.length).toBe(1);
    const currentBasketItem = currentBasketItems[0];

    expect(currentBasketItem.id).toBe(basketItem.id);
  });

  it('get current basket items with purchase basket for account', async () => {
    const account = await accountTestHelper.createNewCustomerAccount();
    const schoolWithKidDetails = await schoolTestHelper.createNewSchoolWithKid();

    const { kid } = schoolWithKidDetails;
    const basketItem = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_BLUE);
    const total = '33';
    const subtotal = '32';
    const deliveryPrice = '1';
    const deliveryName = 'Standard';
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.PENDING, total, subtotal, deliveryPrice, deliveryName);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);
    const currentBasketItems = await basketUtility.getCurrentBasketItemsDetailsWithPurchaseBasketForAccountId(account.id);
    expect(currentBasketItems.length).toBe(1);
    const currentBasketItem = currentBasketItems[0];

    expect(currentBasketItem.id).toBe(basketItem.id);
  });

  it('get current basket items for account', async () => {
    const account = await accountTestHelper.createNewCustomerAccount();
    const schoolWithKidDetails = await schoolTestHelper.createNewSchoolWithKid();

    const { kid } = schoolWithKidDetails;
    const basketItem = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_BLUE);
    const total = '33';
    const subtotal = '32';
    const deliveryPrice = '1';
    const deliveryName = 'Standard';
    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.PENDING, total, subtotal, deliveryPrice, deliveryName);

    const basketItemNoPurchaseBasket = await basketTestHelper.createBasketItem(account, kid, productVariantType, calendarProductType, TEMPLATES.CALENDAR_LANDSCAPE_GREEN);

    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, [basketItem.id]);
    const currentBasketItems = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    expect(currentBasketItems.basketItems.length).toBe(2);
    expect(currentBasketItems.basketItems.map((item) => item.id)).toEqual([basketItemNoPurchaseBasket.id, basketItem.id]);
  });
});
