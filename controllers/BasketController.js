const models = require('../models');
const productController = require('../controllers/ProductController');
const parentController = require('../controllers/ParentController');
const basketUtility = require('../utility/basket/basketUtility');
const productItemUtility = require('../utility/product/productItemUtility');
const productUtility = require('../utility/product/productUtility');
const JOHN_DOE = 'John Doe';


exports.addToBasket = async function(req,res) {
    var quantity = req.body.quantity;
    var productItemId = req.body.productItemId;
    var accountId = req.user.id;
    
    var productItem = await productItemUtility.getProductItemById(productItemId);
    var productVariant = await productUtility.getProductVariantById(productItem.productVariantFk);

    var cost = parseInt(quantity,10) * parseFloat(productVariant.price);
    var doesProductItemStillHaveDefaultPictures = await productController.doesProductItemStillHaveDefaultPictures(productItem);
    if(doesProductItemStillHaveDefaultPictures && ((productVariant.productFk == 1 || productVariant.productFk == 2 || productVariant.productFk == 4) || productVariant.orderNo == 2) ) {
        res.json({error:"Please add picture to the card before attempting to add to basket"})
    }
    else if(productItem.text1 == JOHN_DOE) {
        res.json({error:"Please update name to add to basket"})
    } else {
        var path = productItem.pdfPath;
        var fileName = path.replace(process.env.s3BucketPath,'');

        await basketUtility.createBasketItem(accountId, path, productItemId, productItem.text1,
            fileName, quantity, cost, productItem.picture1Path, productItem.displayItem1, productItem.displayItem2,
            productItem.displayItem3);
        
        var basketItemDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(productItem.accountFk);
        res.json({numberOfBasketItems:basketItemDetails.basketItems.length,subTotal:basketItemDetails.subTotal.toFixed(2)});
    
    }   
}

exports.basket = async function(req,res)
{
    var account = req.user;
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    var isDisplayShippingSectionDetail = await parentController.isDisplayShippingSectionDetail(account.id);
    // var displayMessage = isDisplayShippingSectionDetail.displayMessage ? 'true' : 'false';
    // isDisplayShippingSection
    var deliveryOption = await models.deliveryOption.findOne();
    var countries = await models.country.findAll({}).catch(err=>{
        console.log(err)
    });
    var countryList = countries.filter( o => o.name == 'United Kingdom');
    countries.forEach(country => {
        if(country.name != 'United Kingdom')
            countryList.push(country);
    })
    
    countryList.push('United Kingdom')

    var total = isDisplayShippingSectionDetail.isDisplayShippingSection ? (parseFloat(basketItemsDetails.subTotal) + parseFloat(deliveryOption.option2Price)).toFixed(2) : (parseFloat(basketItemsDetails.subTotal)).toFixed(2);
    res.render('basket3',{user:account,basketItemsDetails:basketItemsDetails, isDisplayShippingSectionDetail:isDisplayShippingSectionDetail,
         total:total, deliveryOption:deliveryOption, countries: countryList});
}

exports.updateBasketItem = async function(req,res)
{
    var basketItemId = req.body.basketItemId;
    var quantity = req.body.newQuantity;
    
    var price = await getPriceForBasketItemId(basketItemId);

    price = parseFloat(price[0].price);
    price = price.toFixed(2);

    var cost = quantity * price;
    await models.basketItem.update({quantity:quantity, cost:cost, versionNo: models.sequelize.literal('versionNo + 1')},
            {
                where:
                {
                    id:basketItemId
                }
            })
    res.json({});
}

async function getPriceForBasketItemId(id)
{
    var price = await models.sequelize.query('select pv.price from productItems pi ' + 
                ' inner join basketItems b on b.productItemFk = pi.id ' +
                ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                ' where b.id = :id', {replacements:{id:id},type: models.sequelize.QueryTypes.SELECT});
    return price;
}

exports.getBasketItemsDetailsForPurchaseBasketId = async function (purchaseBasketId)
{
    var basketItems = await models.sequelize.query('select pv.price, a.email, pi.productItemNumber as code, concat( pv.name, " - ", p.name) as productVariantName, b.id as basketItemId, b.* , ' +
    ' pi.text1 as kidName, if(pi.displayItem3=true,:yes,:no) as displayAge,if(pi.displayItem2=true,:yes,:no) as displayClass,if(pi.displayItem1=true,:yes,:no) as displaySchool, FORMAT(b.cost,2) as cost, pi.classFk, pi.id as productItemId from  basketItems b ' + 
    ' inner join productItems pi on b.productItemFk = pi.id ' +
    ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
    ' inner join products p on pv.productFk = p.id ' +
    ' inner join accounts a on b.accountFk = a.id ' +
    ' where purchaseBasketFk = :purchaseBasketId'  , {replacements:{
        purchaseBasketId: purchaseBasketId, yes:'Yes',no:'No'
          }, type: models.sequelize.QueryTypes.SELECT 
    });

    var subTotal = 0;
    basketItems.forEach(basketItem=>{
        subTotal = subTotal + parseFloat(basketItem.price) * basketItem.quantity;
    });

    return {
        basketItems: basketItems,
        subTotal: subTotal
    }
}

 exports.getIsDisplayCalendarsOptions = async function getIsDisplayCalendarsOptions(accountId)
{
    var count1 = await models.sequelize.query('select count(b.id) as count from productTypes pt ' +
    ' inner join products p on p.productTypeFk = pt.id ' +
    ' inner join productVariants pv on pv.productFk = p.id ' +
    ' inner join productItems pi on pi.productVariantFk = pv.id ' +
    ' inner join basketItems b on b.productItemFk = pi.id ' +
    ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
    ' where pb.status != :completed ' + 
    ' and pt.type = :calendar ' +
    ' and b.accountFk = :accountId ', 
    {replacements:{completed: 'Completed', calendar:'Calendar', accountId:accountId}, type: models.sequelize.QueryTypes.SELECT});

    var count2 = await models.sequelize.query('select count(b.id) as count from productTypes pt ' +
    ' inner join products p on p.productTypeFk = pt.id ' +
    ' inner join productVariants pv on pv.productFk = p.id ' +
    ' inner join productItems pi on pi.productVariantFk = pv.id ' +
    ' inner join basketItems b on b.productItemFk = pi.id ' +
    ' where pt.type = :calendar ' +
    ' and b.accountFk = :accountId ' +
    ' and b.purchaseBasketFk is null ', 
    {replacements:{calendar: 'Calendar', accountId:accountId}, type: models.sequelize.QueryTypes.SELECT})

    var count = count1[0].count + count2[0].count;

    return count == 0;
}

exports.mightLike = async function(req,res)
{
    var accountId = req.user.id;

    var basketItems = await basketUtility.getCurrentBasketItemsDetailsForAccountId(accountId);

    var productIds = new Array();

    basketItems.basketItems.forEach(item => {
        productIds.push(item.productId);
    });

    if(productIds.length == 0)
        return res.redirect('/basket');

    var products = await models.sequelize.query('select p.*, pv.price from products p ' +
            ' inner join productVariants pv on pv.productFk = p.id where p.id not in (:productIds) ' +
            ' and pv.orderNo = 1 ' +
            ' and pv.id = (select id from productVariants where productFk = p.id limit 1)',
            {replacements:{productIds:productIds}, type:models.sequelize.QueryTypes.SELECT});
    
    res.render('mightLike', {user:req.user, products:products, basketItemsDetails:basketItems});
}