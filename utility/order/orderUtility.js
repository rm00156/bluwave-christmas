const models = require('../../models');
const { PRODUCT_TYPES, PRODUCT_TYPE_NAME } = require('../product/productTypes');

async function getOrdersNotShipped() {
  return models.sequelize.query(
    'select distinct pb.*, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchasedDttm, DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm  from purchaseBaskets pb '
        + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
        + ' where pb.status = :completed '
        + ' and pb.shippedFl = false '
        + ' and pb.shippingAddressFk is not null '
        + ' and pb.deleteFl = false ',
    { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getGiveBackAmountDetailsFromOrderDetails(orderItemDetails) {
  let giveBackTotal = 0;
  let photoPackQuantity = 0;
  let photoPackGiveBack = 0;
  let photoTotalCost = 0;
  let standardPackQuantity = 0;
  let standardPackGiveBack = 0;
  let standardTotalCost = 0;
  let calendarQuantity = 0;
  let calendarGiveBack = 0;
  let calendarTotalCost = 0;

  orderItemDetails.forEach((item) => {
    if (item.name === PRODUCT_TYPE_NAME.PHOTO_PACK) {
      photoPackQuantity += parseFloat(item.quantity);
      photoPackGiveBack += (parseFloat(item.quantity) * 0.8);
      photoTotalCost += parseFloat(item.cost);
    } else if (item.name === PRODUCT_TYPE_NAME.STANDARD_PACK) {
      standardPackQuantity += parseFloat(item.quantity);
      standardPackGiveBack += (parseFloat(item.quantity) * 0.7);
      standardTotalCost += parseFloat(item.cost);
    } else if (item.type === PRODUCT_TYPES.CALENDARS) {
      calendarQuantity += parseFloat(item.quantity);
      calendarGiveBack += (parseFloat(item.quantity) * 0.4);
      calendarTotalCost += parseFloat(item.cost);
    }
  });

  giveBackTotal = photoPackGiveBack + standardPackGiveBack + calendarGiveBack;

  const array = {
    giveBackTotal: giveBackTotal.toFixed(2),
    photoPackGiveBack: photoPackGiveBack.toFixed(2),
    photoPackQuantity: photoPackQuantity.toFixed(0),
    photoPackGiveBackPer: 0.80,
    standardPackGiveBackPer: 0.70,
    standardPackGiveBack: standardPackGiveBack.toFixed(2),
    standardPackQuantity: standardPackQuantity.toFixed(0),
    calendarGiveBack: calendarGiveBack.toFixed(2),
    calendarQuantity: calendarQuantity.toFixed(0),
    calendarGiveBackPer: 0.40,
    calendarTotalCost: calendarTotalCost.toFixed(2),
    photoTotalCost: photoTotalCost.toFixed(2),
    standardTotalCost: standardTotalCost.toFixed(2),
  };

  return array;
}

async function getOrdersForAccountId(accountId) {
  return models.sequelize.query('select distinct pb.* from basketItems b '
                        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                        + ' where pb.status = :completed '
                        + ' and b.accountFk = :accountId', {
    replacements: { completed: 'Completed', accountId },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

module.exports = {
  getOrdersNotShipped,
  getGiveBackAmountDetailsFromOrderDetails,
  getOrdersForAccountId,
};
