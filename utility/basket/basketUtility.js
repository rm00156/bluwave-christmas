const models = require('../../models');
const {PURCHASE_BASKET_STATUS} = require('../../utility/basket/purchaseBasketStatus');

async function createBasketItem(accountId, path, productItemId, text1, fileName, quantity,
    cost, picture, displayItem1, displayItem2, displayItem3) {
    return await models.basketItem.create({
        path: path,
        productItemFk: productItemId,
        text1: text1,
        fileName: fileName,
        quantity: quantity,
        accountFk: accountId,
        cost: cost,
        picture: picture,
        displayItem1: displayItem1,
        displayItem2: displayItem2,
        displayItem3: displayItem3,
        deleteFl: false,
        versionNo: 1
    });
}

async function createPurchaseBasket(status, total, subTotal, deliveryPrice, deliveryName, shippingAddressId) {
    return await models.purchaseBasket.create({
        createdDttm: Date.now(),
        status: status,
        total: total,
        subTotal: subTotal,
        shippingAddressFk: shippingAddressId,
        shippedFl: false,
        deliveryPrice: deliveryPrice,
        deliveryName: deliveryName,
        deleteFl: false,
        versionNo: 1
    })
}

async function setBasketItemsToPurchaseBasketId(purchaseBasketId, basketItemIds) {
    await models.sequelize.query('update basketItems set purchaseBasketFk = :purchaseBasketId ' +
        ' where id in (:basketItems)', {
            replacements: { purchaseBasketId: purchaseBasketId, basketItems: basketItemIds },
        type: models.sequelize.QueryTypes.UPDATE
    })
}

async function getCurrentBasketItemsDetailsNoPurchaseBasketForAccountId(accountId) {
    return await models.sequelize.query('select pv.price, p.id as productId, pv.name as productVariantName, pi.id as productItemId, p.name as productName, b.id as basketItemId, b.* from  basketItems b ' +
        ' inner join productItems pi on b.productItemFk = pi.id ' +
        ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
        ' inner join products p on pv.productFk = p.id ' +
        ' where b.accountFk = :accountId ' +
        ' and purchaseBasketFk is null', {
            replacements: {
                accountId: accountId
            }, type: models.sequelize.QueryTypes.SELECT
    });
}

async function getCurrentBasketItemsDetailsWithPurchaseBasketForAccountId(accountId) {
    return await models.sequelize.query('select pv.price, pi.id as productItemId, p.id as productId, pv.name as productVariantName, p.name as productName, b.id as basketItemId,  b.* from basketItems b ' +
        ' inner join productItems pi on b.productItemFk = pi.id ' +
        ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
        ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
        ' inner join products p on pv.productFk = p.id ' +
        ' where b.accountFk = :accountId ' +
        ' and pb.status = :pending', {
            replacements: {
                accountId: accountId, pending: PURCHASE_BASKET_STATUS.PENDING
            }, type: models.sequelize.QueryTypes.SELECT
    });
}

async function getCurrentBasketItemsDetailsForAccountId(accountId) {
    var basketItems = await getCurrentBasketItemsDetailsNoPurchaseBasketForAccountId(accountId);

    var subTotal = 0;
    basketItems.forEach(basketItem => {
        subTotal = subTotal + parseFloat(basketItem.price) * basketItem.quantity;
    });

    var basketItemsWithPurchaseBasket = await getCurrentBasketItemsDetailsWithPurchaseBasketForAccountId(accountId);

    basketItemsWithPurchaseBasket.forEach(basketItem => {
        subTotal = subTotal + parseFloat(basketItem.price) * basketItem.quantity;
        basketItems.push(basketItem);
    });
    return {
        basketItems: basketItems,
        subTotal: subTotal
    }
}

async function getBasketItemById(id) {
    return await models.basketItem.findOne({
        where: {
            id: id
        }
    })
}

async function getPurchaseBasketById(id) {
    return await models.purchaseBasket.findOne({
        where: {
            id: id
        }
    })
}

module.exports = {
    createBasketItem,
    createPurchaseBasket,
    setBasketItemsToPurchaseBasketId,
    getCurrentBasketItemsDetailsForAccountId,
    getBasketItemById,
    getPurchaseBasketById,
    getCurrentBasketItemsDetailsNoPurchaseBasketForAccountId,
    getCurrentBasketItemsDetailsWithPurchaseBasketForAccountId
}
