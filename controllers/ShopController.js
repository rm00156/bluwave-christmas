const models = require('../models');
const productController = require('../controllers/ProductController');
const basketUtility = require('../utility/basket/basketUtility');

exports.shop = async function (req, res) {
    const account = req.user;
    const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

    var category = req.query.category;
    var productType;
    if (category != undefined)
        productType = await productController.getProductTypeByName(category);

    if (productType == null)
        productType = (await models.sequelize.query('select * from productTypes order by id asc limit 1', { type: models.Sequelize.QueryTypes.SELECT }))[0];

    var products = await productController.getAllProductsByProductTypeId(productType.id);
    res.render('shop2', { user: account, basketItemsDetails: basketItemsDetails, products: products, productType: productType });
}