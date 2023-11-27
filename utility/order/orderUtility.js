const models = require('../../models');
const { PRODUCT_TYPES, PRODUCT_TYPE_NAME } = require('../../utility/product/productTypes');

async function getOrdersNotShipped() {
    return await models.sequelize.query('select distinct pb.*, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchasedDttm, DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm  from purchaseBaskets pb ' + 
        ' inner join basketItems b on b.purchaseBasketFk = pb.id ' +
        ' where pb.status = :completed ' + 
        ' and pb.shippedFl = false ' + 
        ' and pb.shippingAddressFk is not null ' +
        ' and pb.deleteFl = false ',
        {replacements:{completed: 'Completed'}, type: models.sequelize.QueryTypes.SELECT});
}

async function getGiveBackAmountDetailsFromOrderDetails(orderItemDetails) {

    var giveBackTotal = 0;
    var photoPackQuantity = 0;
    var photoPackGiveBack = 0;
    var photoTotalCost = 0
    var standardPackQuantity = 0;
    var standardPackGiveBack = 0;
    var standardTotalCost = 0;
    var calendarQuantity = 0;
    var calendarGiveBack = 0;
    var calendarTotalCost = 0;

    orderItemDetails.forEach(item => {
        if (item.name == PRODUCT_TYPE_NAME.PHOTO_PACK) {
            photoPackQuantity = photoPackQuantity + parseFloat(item.quantity);
            photoPackGiveBack = photoPackGiveBack + (parseFloat(item.quantity) * 0.8);
            photoTotalCost = photoTotalCost + parseFloat(item.cost);
        }
        else if (item.name == PRODUCT_TYPE_NAME.STANDARD_PACK) {
            standardPackQuantity = standardPackQuantity + parseFloat(item.quantity);
            standardPackGiveBack = standardPackGiveBack + (parseFloat(item.quantity) * 0.7);
            standardTotalCost = standardTotalCost + parseFloat(item.cost);
        }
        else if (item.type == PRODUCT_TYPES.CALENDARS) {
            calendarQuantity = calendarQuantity + parseFloat(item.quantity);
            calendarGiveBack = calendarGiveBack + (parseFloat(item.quantity) * 0.4);
            calendarTotalCost = calendarTotalCost + parseFloat(item.cost);
        }
    });

    giveBackTotal = photoPackGiveBack + standardPackGiveBack + calendarGiveBack;

    var array = {
        giveBackTotal: giveBackTotal.toFixed(2), photoPackGiveBack: photoPackGiveBack.toFixed(2),
        photoPackQuantity: photoPackQuantity.toFixed(0), photoPackGiveBackPer: 0.80, standardPackGiveBackPer: 0.70,
        standardPackGiveBack: standardPackGiveBack.toFixed(2),
        standardPackQuantity: standardPackQuantity.toFixed(0),
        calendarGiveBack: calendarGiveBack.toFixed(2),
        calendarQuantity: calendarQuantity.toFixed(0), calendarGiveBackPer: 0.40,
        calendarTotalCost: calendarTotalCost.toFixed(2), photoTotalCost: photoTotalCost.toFixed(2),
        standardTotalCost: standardTotalCost.toFixed(2)
    };

    return array;
}

module.exports = {
    getOrdersNotShipped,
    getGiveBackAmountDetailsFromOrderDetails
}
