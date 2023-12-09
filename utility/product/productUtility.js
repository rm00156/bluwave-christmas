const models = require('../../models');

async function createProductVariant(name, orderNo, productId, productVariantTypeId, price, templateId, defaultPdf) {

    return await models.productVariant.create({
        name: name,
        orderNo: orderNo,
        productFk: productId,
        productVariantTypeFk: productVariantTypeId,
        price: price, 
        templateFk: templateId,
        defaultPdf: defaultPdf,
        deleteFl: false,
        versionNo: 1
    });
}

async function createProductVariantTypes(id, type) {
    return models.productVariantType.create({
        id: id,
        type: type,
        deleteFl: false,
        versionNo: 1
    })
}

async function createTemplate(name, displayPath, width, height, textCount, pictureCount, defaultPicturePath) {
    return models.template.create({
        name: name,
        displayPath: displayPath,
        width: width,
        height: height,
        textCount: textCount,
        pictureCount: pictureCount,
        defaultPicturePath: defaultPicturePath,
        deleteFl: false,
        versionNo: 1
    })
}

async function createProduct(productNumber, productTypeId, name, description, displayImagePath, saleFl, kidFl) {
    return models.product.create({
        productNumber: productNumber,
        productTypeFk: productTypeId,
        name: name, 
        description: description, 
        displayImagePath: displayImagePath,
        saleFl: saleFl,
        kidFl: kidFl,
        versionNo: 1,
        deleteFl: false
    })
}

async function createProductItemGroup() {
    return await models.productItemGroup.create({
        deleteFl:false,
        versionNo: 1
    });
}

async function createProductType(type) {
    return await models.productType.create({
        type: type,
        deleteFl: false,
        versionNo: 1
    })
}

async function getProductFromProductItemId(productItemId) {
    var result = await models.sequelize.query(' SELECT p.* FROM productItems pi ' +
        ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
        ' inner join products p on pv.productFk = p.id ' + 
        ' where pi.id = :productItemId ',
        {replacements:{productItemId:productItemId}, type: models.sequelize.QueryTypes.SELECT});

    result = result.length == 0 ? null : result[0];

    return result;
}

async function getProductVariantById(id) {
    return await models.productVariant.findOne({
        where: {
            id: id
        }
    })
}

async function getProductTypeByProductVariantId(id) {
    const productTypes = await models.sequelize.query('select pt.* from productVariants pv ' + 
        ' inner join products p on pv.productFk = p.id ' +
        ' inner join productTypes pt on p.productTypeFk = pt.id ' +
        ' where pv.id = :id ', 
        {replacements: {id: id}, type: models.sequelize.QueryTypes.SELECT});
    return productTypes.length == 0 ? null : productTypes[0];
}

module.exports = {
    createProductVariant,
    createProductVariantTypes,
    createTemplate,
    createProduct,
    createProductItemGroup,
    createProductType,
    getProductFromProductItemId,
    getProductVariantById,
    getProductTypeByProductVariantId
}
