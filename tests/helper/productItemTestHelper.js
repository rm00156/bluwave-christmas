const productUtility = require('../../utility/product/productUtility');
const productItemUtility = require('../../utility/product/productItemUtility');

async function generateProductItem(account, kid, productVariantTypeId, templates, productType) {
    const template = await productUtility.createTemplate(templates, '', '', '', 1, 1, '');
    
    const product = await productUtility.createProduct('12345', productType.id, '4', '', '', false, false);
    const productVariant = await productUtility.createProductVariant(productType.type, 1, product.id, productVariantTypeId, '22', template.id, '');

    const productItemGroup = await productUtility.createProductItemGroup();
    const productItemNumber = await productItemUtility.getNewProductItemNumber();
    var object = {
        productItemNumber: productItemNumber,
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
        versionNo: 1
    };
    const productItem = await productItemUtility.createProductItem(object);
    return productItem;
}

module.exports = {
    generateProductItem
}