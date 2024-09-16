const models = require('../../models');
const {makeCode} = require('../general/generalUtility')

async function createProductItem(details) {
    return models.productItem.create(details);
}

async function getNewProductItemNumber() {
    var number = makeCode();

    var productItem = await getProductItemByNumber(number);

    if(productItem == null)
        return number;
    
    return await getNewProductItemNumber();
}

async function getProductItemByNumber(number) {
    return await models.productItem.findOne({
        where:{
            productItemNumber: number
        }
    });
}

async function getProductItemById(id) {
    return await models.productItem.findOne({
        where: {
            id: id
        }
    })
}

async function setClassForProductItemByProductItemGroupId(classId, productItemGroupId) {
    await models.productItem.update({
        classFk: classId,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            productItemGroupFk: productItemGroupId
        }
    })

}

module.exports = {
    createProductItem,
    getProductItemByNumber,
    getNewProductItemNumber,
    getProductItemById,
    setClassForProductItemByProductItemGroupId
}
