const models = require('../models');
const kidController = require('../controllers/KidController');
const basketController = require('../controllers/BasketController');
const dadController = require('../controllers/DadController');
const queueController = require('../controllers/QueueController');

const defaultDummyImagePath = 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Dummy+School/2019/Dummy+Individual/1570297526783_John+Doe_vP60Qg3.pdf';
const aws = require('aws-sdk');
const puppeteer = require('puppeteer');
const hbs = require('handlebars');
// const process.env = require('../process.env/process.env.json');
const path = require('path');
const fs = require('fs-extra');
const Queue = require('bull');
const { kid } = require('./DashboardController');


exports.getSearchProductsPage = async function(req,res)
{
    var productTypes = await getAllProductTypes();

    res.render('newAdminProducts', {productTypes:productTypes})
}

exports.getProductByNumber = async function(number)
{
    return await getProductByNumber(number);
}

async function getProductByNumber(number)
{
    var product = await models.sequelize.query('select p.id as productId, p.*, p.deleteFl as status, pt.type as productType from products p ' + 
                            ' inner join productTypes pt on p.productTypeFk = pt.id ' + 
                            ' where p.productNumber = :number ', {
                                replacements:{number:number},type: models.sequelize.QueryTypes.SELECT
                            });

    return product.length == 0 ? null : product[0];
}

exports.getProductById = async function(productId)
{
    return await getProductById(productId);
}

async function getProductById(productId)
{
    var product = await models.sequelize.query('select p.id as productId, p.*, p.deleteFl as status, pt.type as productType from products p ' + 
                            ' inner join productTypes pt on p.productTypeFk = pt.id ' + 
                            ' where p.id = :id ', {
                                replacements:{id:productId},type: models.sequelize.QueryTypes.SELECT
                            });

    return product.length == 0 ? null : product[0];
}


exports.getAllProductTypes = async function()
{
    return await getAllProductTypes();
}

exports.searchProductsResults = async function(req,res)
{
    // needs to be reworked
    var idSearch = req.body.idSearch;
    var nameSearch = req.body.nameSearch;
    var productType = req.body.productType;
    var status = req.body.status;

    var query = 'select *, pt.type as productType, p.deleteFl as status, t.* as template, pr.price1 from products p '  + 
    ' inner join productTypes pt on p.productTypeFk = pt.id ' + 
    ' inner join prices pr on p.priceFk = pr.id ' +
    ' where p.name like :name ' + 
    ' and p.productNumber like :productNumber ';

    console.log(productType)
    if(productType != 0)
        query = query + ' and p.productTypeFk = :productType ';
    
    if(status != 0)
    {
        query = query + ' and p.deleteFl = :status';
        status = status != 1;
    }

    var result = await models.sequelize.query(query, {replacements:{
            name: '%'+ nameSearch +'%',
            productNumber: '%'+ idSearch +'%',
            productType: productType,
            status: status,         
        }, type: models.sequelize.QueryTypes.SELECT });
    
    res.json({result:result});
}

exports.getProductDetailsPage = async function(req,res)
{
    var number = req.query.number;
    var productDetail = await getProductByNumber(number);
    
    res.render('newProductDetails',{productDetail:productDetail})
}

async function getAllProductTypes()
{
    return await models.productType.findAll();
}

exports.getProductTypeByName = async function(name)
{
    return await models.productType.findOne({
        where:{
            type:name,
            deleteFl: false
        }
    })
}

exports.getAllProductsByProductTypeId = async function(productTypeId)
{
    // var result = await models.sequelize.query('select distinct p.*, pi.productItemNumber, pv.price, pv.id as productVariantId from producttypes pt ' +
    //     ' inner join products p on p.productTypeFk = pt.id ' +
    //     ' inner join productVariants pv on pv.productFk = p.id ' +
    //     ' inner join productItems pi on pi.productVariantFk = pv.id ' +
    //     ' where pt.id = :productTypeId ' +
    //     ' and pv.orderNo = 1 ' +
    //     ' and pi.accountFk = :accountId ' + 
    //     ' and pi.id = (select id from productItems where productVariantFk = pv.id limit 1)',
    //             {replacements:{productTypeId:productTypeId, accountId:accountId},
    //              type: models.sequelize.QueryTypes.SELECT} );
    
    // if(result.length != 0)
    //     return result;
    
    return await models.sequelize.query('select distinct p.*, pv.price, pv.id as productVariantId from producttypes pt ' +
        ' inner join products p on p.productTypeFk = pt.id ' +
        ' inner join productVariants pv on pv.productFk = p.id ' +
        ' where pt.id = :productTypeId ' +
        ' and pv.orderNo = 1 ' +
        ' and pv.id = (select id from productVariants where productFk = p.id limit 1)',
            {replacements:{productTypeId:productTypeId},
                        type: models.sequelize.QueryTypes.SELECT})
}

exports.getProductItemScreen = async function(req,res)
{
    // get all kids linked to account for productitem
    var account = req.user;
    var productNumber = req.query.productNumber;
    var productItemNumber = req.query.productItemNumber;
    var kidCode = req.query.kidCode;
    var product = await getProductByNumber(productNumber);
    var productId = product.productId;
    var productVariantId = req.query.productVariantId;
    var basketItemsDetails = await basketController.getBasketItemsDetailsForAccountId(account.id);

    if(product == null)
    {
        throw 'No product was found with number ' + productNumber;
    }

    var productItem;
    var productVariant;
    if(productItemNumber == undefined)
    {
        // does productitem for product exist for this user
        var existingProductItems = await getProductItemsWithProductForAccount(productId, account.id);
        var kid = null;

        var kids = await kidController.getKidsFromAccountIdAndProductId(account.id, productId);
        var existing = new Set();
        
        existingProductItems.forEach(element => {
            existing.add(element.kidFk);
        });

        if(kidCode != undefined)
        {
            kid = await kidController.getKidByCode(kidCode);
            existingProductItems = await getProductItemsWithProductForAccount(productId, account.id, kid.id);
        }
        
        
        if(existingProductItems.length == 0 || (existingProductItems.length/2 != kids.length))
        {
            var productItems = await createProductItems(product,kidCode,account);
            productItem = productItems[0];
            productVariant = await getProductVariantById(productItem.productVariantFk);

            // no productItem for product

        }
        else
        {
            if(productVariantId != undefined)
            {
                productVariant = await getProductVariantById(productVariantId);
                if(productVariant == null)
                {
                    productItem = existingProductItems.filter(o => o.orderNo == 1)[0];
                    productVariant = await getProductVariantById(productItem.productVariantFk);
                }
                else
                {
                    throw 'Invalid productVariantId'
                    // // productItem = await getProductItemByProductVariant(productVariantId, account.id);   
                    // productItem = kid != null ? existingProductItems.filter( o => o.productVariantFk == productVariantId && 
                    //                         o.kidFk == kid.id)[0] : existingProductItems.filter( o => o.productVariantFk == productVariantId)[0];
                                            
                }
            }
            else
            {
                productItem = existingProductItems.filter(o => o.orderNo == 1)[0];
                productVariant = await getProductVariantById(productItem.productVariantFk);
            }  
        }
    }
    else
    {
        productItem = await getProductItemByNumber(productItemNumber);
        
        if(productItem.length == 0)
            throw 'No productItem found for productItemNumber ' + productItemNumber;
        
        productItem = productItem[0];
        
        if(productItem.productVariantFk != productVariantId)
            throw "ProductVariantId doesn't match productItem with number " + productItemNumber;

        productVariant = await getProductVariantById(productItem.productVariantFk);
        
    }

    // at this point productItem is defined
    var kids = await kidController.getKidsForProductAndAccount(productId, account.id);
    var kid = null;
    var kidsList = kids.filter( o => o.id == productItem.kidFk);
    kids.forEach( kid => {
        if(kid.id != productItem.kidFk)
            kidsList.push(kid);
    })
    
    if(kids != null)
        kid = kidsList[0];

    var productVariants = await getProductVariantsForProductItemGroupId(productItem.productItemGroupFk);
    
    res.render('productItem2', {user:req.user,productItem:productItem, basketItemsDetails:basketItemsDetails,product:product,
         productVariants:productVariants, productVariant:productVariant, kidsList:kidsList, kid:kid});

}

exports.createProductItems = async function(product, kidCode, account)
{
    return await createProductItems(product, kidCode, account);
}

async function createProductItems(product, kidCode, account)
{
    var productItems = null;
    var isAccountLinkedToASchoolInScheme = await kidController.isAccountLinkedToASchoolInScheme(account.id);
    var productItemGroup;

    if(product.kidFl)
    {
        var kid;
        
        if(kidCode != undefined)
        {
            kid = await kidController.getKidByCode(kidCode);
            // generateCard
            // create productit
            productItemGroup = await models.productItemGroup.create({
                deleteFl:false,
                versionNo: false
            });
            productItems = await generateProductItemForKid(kid, product.id, false, isAccountLinkedToASchoolInScheme, productItemGroup);
        } 
        else
        {
            // if no kids
            // var kids = await kidController.getKidsFromAccountId(account.id);
            // if(kids.length == 0 )
            // {
                kid = await kidController.createKid('John Doe', 5, 0, null, account);
                productItemGroup = await models.productItemGroup.create({
                    deleteFl:false,
                    versionNo: false
                });
                productItems = await generateProductItemForKid(kid,product.id, true, isAccountLinkedToASchoolInScheme, productItemGroup);
            // }
            // else
            // {
            //     var existingProductItems = await getProductItemsWithProductForAccount(product.id, account.id);
            //     for( var i = 0; i < kids.length; i++ )
            //     {
            //         productItemGroup = await models.productItemGroup.create({
            //             deleteFl:false,
            //             versionNo: false
            //         });
            //         kid = kids[i];
            //         var existing = existingProductItems.filter(o => o.kidFk == kid.id);
                    
            //         if(existing.length == 0)
            //             productItems = await generateProductItemForKid(kid,product.id, false, isAccountLinkedToASchoolInScheme, productItemGroup);
            //     }
            // }
            
        }

        // generate the dummy card
        // if kidCode undefined then wont have to generate anything
        // should be able to just create the productitem and load screen
        return productItems;
    }
    else
    {
        // for now calendars are just images so dont need to go through the hassle of generating them unless this changes
        var existingProductItems = await getProductItemsWithProductForAccount(product.id, account.id);
                
        if(existingProductItems.length == 0)
        {
            productItemGroup = await models.productItemGroup.create({
                deleteFl:false,
                versionNo: false
            });
            // create productItem
            productItems = await generateProductItemNoKid(product.productId,true, account.id, productItemGroup);
        
        }
        else
        {
            productItems = existingProductItems;
        }
        
        return productItems;
    }

}

exports.getProductItemsWithProductForAccount = async function(productId, accountId, kidId)
{
    return await getProductItemsWithProductForAccount(productId, accountId, kidId);
}

async function getProductItemsWithProductForAccount(productId, accountId, kidId)
{
    var query = 'select pi.*, pv.orderNo, pv.price, pvt.type as productVariantType from productItems pi ' + 
                ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
                ' where pv.productFk = :productId ' + 
                ' and pi.accountFk = :accountId ' + 
                ' and pi.deleteFl = false ' + 
                ' and pv.deleteFl = false ';

    if(kidId != undefined)
        query = query + ' and pi.kidFk = :kidId ';

    return await models.sequelize.query(query, {replacements:{kidId:kidId,productId: productId, accountId:accountId}, type: models.sequelize.QueryTypes.SELECT});
    
    
}

exports.getProductItemsWithProductForKid = async function(productId, kidId)
{
    return await getProductItemsWithProductForKid(productId, kidId);
}

async function getProductItemsWithProductForKid(productId, kidId)
{
    return await models.sequelize.query('select pi.*, pv.orderNo, pv.price, pvt.type as productVariantType from productItems pi ' + 
            ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
            ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
            ' where pv.productFk = :productId ' + 
            ' and pi.kidFk = :kidId ' + 
            ' and pi.deleteFl = false ' + 
            ' and pv.deleteFl = false ', {replacements:{productId: productId, kidId:kidId}, type: models.sequelize.QueryTypes.SELECT});
    
}

exports.getProductItemsWithProductForAccountAndNotWithKid = async function(productId, accountId)
{
    return await getProductItemsWithProductForAccountAndNotWithKid(productId, accountId);
}

async function getProductItemsWithProductForAccountAndNotWithKid(productId, accountId)
{
    return await models.sequelize.query('select pi.*, pv.orderNo, pv.price, pvt.type as productVariantType from productItems pi ' + 
            ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
            ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
            ' where pv.productFk = :productId ' + 
            ' and pi.kidFk is null' + 
            ' and pi.accountFk = :accountId ' +
            ' and pi.deleteFl = false ' + 
            ' and pv.deleteFl = false ', {replacements:{productId: productId, accountId:accountId}, type: models.sequelize.QueryTypes.SELECT});
    
}

exports.getProductItemByNumber = async function(number)
{
    return await getProductItemByNumber(number);
}

async function getProductItemByNumber(number)
{
    return await models.sequelize.query('select pi.*, pi.productItemGroupFk, pv.orderNo, pv.price, pv.productFk as productId, pvt.type as productVariantType from productItems pi ' + 
    ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
    ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
    ' and pi.productItemNumber = :number ' +
    ' and pi.deleteFl = false ' + 
    ' and pv.deleteFl = false ', {replacements:{number: number}, type: models.sequelize.QueryTypes.SELECT});

}

exports.generateUpdateProductItem = async function(kid, productId, accountId)
{
    return await generateUpdateProductItem(kid, productId, accountId);
}

async function generateUpdateProductItem(kid, productId, accountId)
{
    var kidSchoolClassDetails = null;
    var productItems;
    if(kid == null)
    {
        productItems = await getProductItemsWithProductForAccountAndNotWithKid(productId, accountId);
    }
    else
    {
        kidSchoolClassDetails = await kidController.getKidClassAndSchoolFromKidId(kid.id);
        productItems = await getProductItemsWithProductForKid(productId, kid.id);
    }

    for( var i = 0 ; i < productItems.length; i++ )
    {
        var productItem = productItems[i];

        var displayYears;
        var displayMonths;
        var displayBoth;

        if( productItem.text2 != 0 && productItem.text3 != 0 )
        {
            // display both
            displayBoth = 'true';
        }
        else if( productItem.text2 != 0)
        {
            // display year
            displayYears = 'true';
        }
        else
        {
            // display month
            displayMonths = 'true';
        }

        var data = {
            // "school":kidSchoolClassDetails.school,
            "code":productItem.productItemNumber,
            "name":productItem.text1,
            "age":productItem.text2,
            "month":productItem.text3,
            // "class":kidSchoolClassDetails.class,
            "year": 2022,
            // "kidId":kid.id,
            "displaySchool":productItem.displayItem1,
            "displayClass":productItem.displayItem2,
            "displayAge":productItem.displayItem3,
            "displayYears":displayYears,
            "displayMonths": displayMonths,
            "displayBoth": displayBoth
        }

        if(kidSchoolClassDetails != null)
        {
            data['school'] = kidSchoolClassDetails.school;
            data['class'] = kidSchoolClassDetails.class;
        }

        var productVariantItem = await getProductVariantForProductItemId(productItem.id);

        for( var j = 0; j < productVariantItem.pictureCount; j++)
        {
            var index = (j + 1);
            data['picture' + index] = productItem['picture' + index + 'Path' ];
        }

        var s3Path = await generateProductItemPdf(data, productVariantItem);

        await models.productItem.update({
            pdfPath: s3Path
        },{
            where:{
                id: productItem.id,
                versionNo: models.sequelize.literal('versionNo + 1')
            }
        });
    }

}

async function generateProductItemNoKid(productId,dummy, accountId, productItemGroup)
{
    var productVariants = await getProductVariantsForProductId(productId);
    var array = new Array();

    for( var i = 0 ; i < productVariants.length; i++ )
    {
        var productVariantItem = productVariants[i];
        var data = [];

        for( var j = 0; j < productVariantItem.pictureCount; j++)
        {
            var index = (j + 1);
            data['picture' + index] = productVariantItem['defaultPicture' + index + 'Path' ];
        }

        data['accountId'] = accountId;
        var productItem = !dummy ? createProductItemPdf(data, productVariantItem, productItemGroup)
                    : await createProductItemObjectNoKid(productVariantItem, data, productVariantItem.defaultPdf, productItemGroup);
                    
        productItem['price'] = productVariantItem.price;
        array.push(productItem);
    }

    return array;
}

exports.generateProductItemForKid = async function(kid, productId, dummy, isAccountLinkedToASchoolInScheme)
{
    return await generateProductItemForKid(kid, productId, dummy, isAccountLinkedToASchoolInScheme);
}

async function generateProductItemForKid(kid, productId, dummy, isAccountLinkedToASchoolInScheme, productItemGroup)
{
    // no productItem created at this point
    // we will be returning the created procuctItem

    let displayYears;
    let displayMonths;
    let displayBoth;

    if( kid.age != 0 && kid.month != 0 )
    {
        // display both
        displayBoth = 'true';
    }
    else if( kid.age != 0)
    {
        // display year
        displayYears = 'true';
    }
    else
    {
        // display month
        displayMonths = 'true';
    }
    var kidSchoolClassDetails = await kidController.getKidClassAndSchoolFromKidId(kid.id);

    var productVariants = await getProductVariantsForProductId(productId);
    var array = new Array();

    for( var i = 0 ; i < productVariants.length; i++ )
    {
        var productVariantItem = productVariants[i];

        var data = {
            "code":kid.code,
            "name":kid.name,
            "age":kid.age,
            "month":kid.month,
            "year": 2022,
            "kidId":kid.id,
            "displaySchool":isAccountLinkedToASchoolInScheme && kidSchoolClassDetails != null,
            "displayClass":isAccountLinkedToASchoolInScheme && kidSchoolClassDetails != null,
            "displayAge":true,
            "displayYears":displayYears,
            "displayMonths": displayMonths,
            "displayBoth": displayBoth
        }

        if(isAccountLinkedToASchoolInScheme && kidSchoolClassDetails != null)
        {
            data['school'] = kidSchoolClassDetails.school;
            data['class'] = kidSchoolClassDetails.class;
        }

        for( var j = 0; j < productVariantItem.pictureCount; j++)
        {
            var index = (j + 1);
            data['picture' + index] = productVariantItem['defaultPicture' + index + 'Path' ];
        }
    
        var productItem = !dummy ? await createProductItemForKidPdf(data, productVariantItem, kid, productItemGroup) 
                    : await createProductItemObject(productVariantItem, data, kid, null, productItemGroup) ;
                    
        productItem['price'] = productVariantItem.price;
        array.push(productItem);
    }

    return array;
}

async function getProductVariantsForProductId(productId)
{
    return await models.sequelize.query('select pv.id as productVariantId, pvt.type as productVariantType,  pv.name as productVariantName, pv.*, t.id as templateId, t.*, t.name as templateName from productVariants pv ' + 
                ' inner join templates t on pv.templateFk = t.id ' + 
                ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
                ' where pv.productFk = :productId order by pv.orderNo asc',{replacements:{productId:productId}, type: models.sequelize.QueryTypes.SELECT});
}

async function getProductVariantForProductItemId(productItemId)
{
    var result = await models.sequelize.query('select pv.id as productVariantId, pvt.type as productVariantType,  pv.name as productVariantName, pv.*, t.id as templateId, t.*, t.name as templateName from productVariants pv ' + 
                ' inner join templates t on pv.templateFk = t.id ' + 
                ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
                ' inner join productItems pi on pi.productVariantFk = pv.id ' +
                ' where pi.id = :productItemId order by pv.orderNo asc',{replacements:{productItemId:productItemId}, type: models.sequelize.QueryTypes.SELECT});
    return result.length == 0 ? null : result[0];
}

async function createProductItemForKidPdf(data, productVariantItem, kid, productItemGroup)
{
    var s3Path = await generateProductItemPdf(data, productVariantItem);

    return await createProductItemObject(productVariantItem, data, kid, s3Path, productItemGroup);
}

async function createProductItemPdf(data, productVariantItem)
{
    var s3Path = await generateProductItemPdf(data, productVariantItem);

    return await createProductItemObjectNoKid(productVariantItem, data, s3Path);
}

async function generateProductItemPdf(data, productVariantItem)
{
    const browser = await puppeteer.launch({
        'args' : [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    const content = await compile(productVariantItem.templateName, data);
    await page.setContent(content);

    
    var fileLocation = data.school + "/" + data.year + "/" + data.class + "/";
    var filename =  data.name + "_" + data.code + ".pdf";
    const tempDir = "dataDir/temp/OutBound/" + + fileLocation + filename;

    await page.setViewport({width:1400,height:800, deviceScaleFactor:2 });
    const buffer = await page.pdf({
        printBackground: true ,
        landscape: false,
        width:productVariantItem.width,
        height: productVariantItem.height 
    });

    await page.close();
    await browser.close();
    

    const s3 = new aws.S3();
    let s3FileLocation = fileLocation + Date.now() + "_" + filename;
    var params = {
      Bucket:process.env.bucketName,
      Body: buffer,
      Key: s3FileLocation,
      ACL:'public-read'
    };

    var s3UploadPromise = new Promise(function(resolve, reject) {
        s3.upload(params, function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });

    await s3UploadPromise;
    var s3Path = process.env.s3BucketPath + s3FileLocation;

    return s3Path;
}

async function getNewProductItemNumber()
{
    var number = dadController.makeCode();

    var productItem = await models.productItem.findOne({
        where:{
            productItemNumber: number
        }
    });

    if(productItem == null)
        return number;
    
    return await getNewProductItemNumber();
}

async function createProductItemObjectNoKid(productVariantItem,data, s3Path, productItemGroup)
{
    var productItemNumber = await getNewProductItemNumber();
    var object = {
        productItemNumber: productItemNumber,
        productVariantFk: productVariantItem.productVariantId,
        productItemGroupFk: productItemGroup.id,
        pdfPath: s3Path,
        displayItem1: false,
        displayItem2: false,
        displayItem3: false,
        accountFk: data.accountId,
        deleteFl: false,
        versionNo: 1

    }
    for( var i = 0; i < productVariantItem.pictureCount; i++ )
    {
        var index = i + 1;
        object['picture' + index + 'Path' ] = data['picture' + index ];
    }

    var t = await models.sequelize.transaction();
    var productItem = null;
    try
    {
       productItem = await models.productItem.create(object,t); 
    }
    catch(err)
    {
        console.log(err)

        // throw an exception
       return await t.rollback();
    }

    await t.commit();
    return productItem;
}


async function createProductItemObject(productVariantItem, data, kid, s3Path, productItemGroup)
{
    var productItemNumber = await getNewProductItemNumber();
    var object = {
        productItemNumber: productItemNumber,
        productVariantFk: productVariantItem.productVariantId,
        productItemGroupFk: productItemGroup.id,
        accountFk: kid.parentAccountFk,
        displayItem1: true,
        displayItem2: true,
        displayItem3: true,
        classFk: kid.classFk,
        text1: data.name,
        text2: data.age,
        text3: data.month,
        text4: data.school,
        text5: data.class,
        kidFk: kid.id,
        pdfPath: s3Path != null ? s3Path : productVariantItem.defaultPdf,
        deleteFl: false,
        versionNo: 1
    }

    for( var i = 0; i < productVariantItem.pictureCount; i++ )
    {
        var index = i + 1;
        object['picture' + index + 'Path' ] = data['picture' + index ];
    }

    var t = await models.sequelize.transaction();
    var productItem = null;
    try
    {
       productItem = await models.productItem.create(object,t); 
    }
    catch(err)
    {
        console.log(err)

        // throw an exception
       return await t.rollback();
    }

    await t.commit();
    return productItem;
}

async function createDummyProductItemForProduct(kid,productId)
{
    var productVariants = await getProductVariantsForProductId(product.id);
    var array = new Array();

    for( var i = 0 ; i < productVariants.length; i++ )
    {
    }
}

exports.getProductByName = async function(name)
{
    return await getProductByName(name);
}

async function getProductByName(name)
{
    return await models.product.findOne({
        where:{
            name:name,
            deleteFl: false
        }
    });
}

aws.config.update({
    secretAccessKey: process.env.secretAccessKey,
    accessKeyId:process.env.accessKeyId,
    region: process.env.region
});

const compile = async function(templateName, data)
{
const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
const html = await fs.readFile(filePath,'utf-8');

return hbs.compile(html)(data);
}
  
hbs.registerHelper('dateFormat', (value,format)=>{
console.log('formatting', value, format);
return moment(value).format(format);
});

exports.getProductVariantById = async function(productVariantId)
{
    return await getProductVariantById(productVariantId);
}

async function getProductVariantById(productVariantId)
{
    var result = await models.sequelize.query('select pv.*, pvt.type as productVariantType from productVariants pv ' + 
                    ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' + 
                    ' where pv.id = :productVariantId ' +
                    ' and pv.deleteFl = false ', {replacements:{productVariantId:productVariantId}, type:models.sequelize.QueryTypes.SELECT});
    return result.length == 0 ? null : result[0];
}

async function getProductItemByProductVariant(productVariantId, accountId, kidCode)
{
    var query = 'select pi.*, pvt.type as productVariantType, pv.price from productItems pi ' + 
    ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
    ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' + 
    ' where pv.id = :productVariantId ' +
    ' and pi.accountFk = :accountId ' +
    ' and pv.deleteFl = false ' +
    ' and pi.deleteFl = false';

    var kidId = null;
    if(kidCode != undefined)
    {
        var kid = await kidController.getKidByCode(kidCode);
        kidId = kid.id;
        query = query + ' and pi.kidFk = :kidId ';
    }
        
    var result = await models.sequelize.query(query, {replacements:{
                            productVariantId:productVariantId,
                            accountId:accountId,
                            kidId:kidId}, type:models.sequelize.QueryTypes.SELECT});
    
    return result.length == 0 ? null : result[0];
}

exports.getProductItemById = async function(id)
{
    return await getProductItemById(id);
}

async function getProductItemById(id)
{
    return await models.productItem.findOne({
        where:{
            id:id
        }
    });
}

exports.uploadAndGenerate = async function(req,res)
{
    var productItemId = req.body.productItemId;
    var job = await queueController.addUploadAndGenerateJob(productItemId,req.body.pictureNumber,req.body.productId,req.files);
    res.json({id:job.id, productNumber:req.body.productNumber, productVariantId: req.body.productVariantId, totalSteps:6}); 
}

exports.updateAndGenerate = async function(req,res)
{
    var productItemId = req.body.productItemId;
    var job = await queueController.addUpdateAndGenerateJob(productItemId,req.body.productId,req.body.name, req.body.age,req.body.month,
           req.body.displaySchool == 'true', req.body.displayClass == 'true', req.body.displayAge == 'true');

    var productItem = await getProductItemById(productItemId)
    res.json({id:job.id, productNumber:req.body.productNumber, productVariantId: req.body.productVariantId, productItemNumber: productItem.productItemNumber, totalSteps:4}); 

}

exports.getUploadAndGenerateJob = async function(req,res)
{
    var id = req.query.id;
    var job = await queueController.getJobId(id);
  
    if (job === null) {
      res.status(404).end();
    } else {
        var state = await job.getState();
        var progress = job._progress;
        var reason = job.failedReason;
        var process = job.data.process;
        res.json({ id, state, progress, reason, process });
    }
}

exports.getUpdateAndGenerateJob = async function(req,res)
{
    var id = req.query.id;
    var job = await queueController.getJobId(id);
  
    if (job === null) {
      res.status(404).end();
    } else {
        var state = await job.getState();
        var progress = job._progress;
        var reason = job.failedReason;
        var process = job.data.process;
        res.json({ id, state, progress, reason, process });
    }
}

exports.doesProductItemStillHaveDefaultPictures = async function(productItem)
{
    var template = await getTemplateFromProductItemId(productItem.id);
    var pictureCount = template.pictureCount;
    var productVariant = await getProductVariantById(productItem.productVariantFk);

    for(var i = 0; i < pictureCount; i++)
    {
        var index = (i+1);
        var defaultPicture = template['defaultPicture' + index + 'Path'];
        var productItemPicture = productItem['picture' + index + 'Path'];

        if(defaultPicture == productItemPicture && (productVariant.productFk == 1 || productVariant.productFk == 2 || productVariant.productFk == 4))
            return true;

        if(defaultPicture == productItemPicture && (productVariant.productFk != 1 && productVariant.productFk != 2 && productVariant.productFk != 4))
        {
            if(index > 1)
                return true;
        }
        
    }

    return false;
}

async function getTemplateFromProductItemId(productItemId)
{
    var result = await models.sequelize.query('select * from productItems pi ' + 
                ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                ' inner join templates t on pv.templateFk = t.id ' + 
                ' where pi.id = :productItemId ', 
                {replacements:{productItemId:productItemId}, type:models.sequelize.QueryTypes.SELECT});
    return result.length == 0 ? null : result[0];
}

exports.getPriceForProductItemId = async function(id)
{
    var price = await models.sequelize.query('select pv.price from productItems pi ' + 
                ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                ' where pi.id = :id', {replacements:{id:id},type: models.sequelize.QueryTypes.SELECT});
    return price;
}

exports.getProductVariantsForProductItemGroupId = async function(productItemGroupId)
{
    return await getProductVariantsForProductItemGroupId(productItemGroupId);
}

async function getProductVariantsForProductItemGroupId(productItemGroupId)
{
    return await models.sequelize.query('select distinct pv.id as productVariantId, pi.productItemNumber, pvt.type as productVariantType,  pv.name as productVariantName, pv.* from productItems pi ' +
            ' inner join productItemGroups pis on pi.productItemGroupFk = pis.id ' + 
            ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
            ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
            ' where pis.id = :productItemGroupId ', {replacements:{productItemGroupId:productItemGroupId},
            type: models.sequelize.QueryTypes.SELECT});
}

exports.getProductItemsForKidNumber = async function(kidNumber)
{
    return await getProductItemsForKidNumber(kidNumber);
}

async function getProductItemsForKidNumber(kidNumber)
{
    var query = ' select pi.*, pv.orderNo, p.productNumber, pv.id as productVariantId, p.name as productName, p.displayImagePath, pt.type as productType, pv.name as productVariantName, pvt.type as productVariantType from productItems pi ' + 
                ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
                ' inner join products p on pv.productFk = p.id ' +
                ' inner join productTypes pt on p.productTypeFk = pt.id ' +
                ' inner join kids k on pi.kidFk = k.id ' +
                ' where k.code = :kidNumber ' ;

    return await models.sequelize.query(query, {replacements:{kidNumber:kidNumber},
         type: models.sequelize.QueryTypes.SELECT});
    
    
}

exports.getProductItemsForAccountNumber = async function(accountNumber)
{
    return await getProductItemsForAccountNumber(accountNumber);
}

async function getProductItemsForAccountNumber(accountNumber)
{
    var query = ' select pi.*, pv.orderNo, p.productNumber, pv.id as productVariantId, p.name as productName, p.displayImagePath, pt.type as productType, pv.name as productVariantName, pvt.type as productVariantType from productItems pi ' + 
                ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id ' +
                ' inner join products p on pv.productFk = p.id ' +
                ' inner join productTypes pt on p.productTypeFk = pt.id ' +
                ' inner join accounts a on pi.accountFk = a.id ' +
                ' where a.accountNumber = :accountNumber ' ;

    return await models.sequelize.query(query, {replacements:{accountNumber:accountNumber},
         type: models.sequelize.QueryTypes.SELECT});
    
}

async function getProductFromProductItemId(productItemId)
{
    var result = await models.sequelize.query(' SELECT p.* FROM productItems pi ' +
        ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
        ' inner join products p on pv.productFk = p.id ' + 
        ' where pi.id = :productItemId ',
        {replacements:{productItemId:productItemId}, type: models.sequelize.QueryTypes.SELECT});

    result = result.length == 0 ? null : result[0];

    return result;
}

exports.getProductFromProductItemId = async function(productItemId)
{
    return await getProductFromProductItemId(productItemId);
}