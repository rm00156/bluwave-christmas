const productItemTestHelper = require('./productItemTestHelper');
const basketUtility = require('../../utility/basket/basketUtility');

const PATH = 'path';
const TEXT_1 = 'text1';
const FILENAME = 'filename';
const QUANTITY = 1;
const COST = '45';
const PICTURE = 'picture';
const DISPLAY_ITEM_1 = 0;
const DISPLAY_ITEM_2 = 0;
const DISPLAY_ITEM_3 = 1;

async function createBasketItem(account, kid, productVariantType, productType, template) {
  const productItem = await productItemTestHelper.generateProductItem(account, kid, productVariantType.id, template, productType, '1234');
  const basketItem = await basketUtility.createBasketItem(account.id, PATH, productItem.id, TEXT_1, FILENAME, QUANTITY, COST, PICTURE, DISPLAY_ITEM_1, DISPLAY_ITEM_2, DISPLAY_ITEM_3);
  return basketItem;
}

module.exports = {
  createBasketItem,
};
