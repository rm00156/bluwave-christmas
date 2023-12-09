const models = require('../models');
const basketController = require('../controllers/BasketController');
const queueController = require('../controllers/QueueController');
const classController = require('../controllers/ClassController');
const schoolUtility = require('../utility/school/schoolUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');
const {PURCHASE_BASKET_STATUS} = require('../utility/basket/purchaseBasketStatus');

const env = process.env.NODE_ENV || "development";
var stripe = require('stripe')(process.env.stripe_server);
const endpointSecret = process.env.endpointSecret;
const PDFMerge = require('pdf-merge');
const aws = require('aws-sdk');
// const process.env = require('../process.env/process.env.json');
const archiver = require('archiver');

const fs = require('fs-extra');

aws.config.update({
    secretAccessKey: process.env.secretAccessKey,
    accessKeyId:process.env.accessKeyId,
    region: process.env.region
  });


exports.getParentOrders = async function(req,res) {
    var accountId = req.query.accountId;
    
    accountId = accountId == undefined ? req.user.id : accountId;
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(accountId);
    var orders = await getOrdersForAccountId(accountId);
    res.render('parentOrders', {user:req.user, basketItemsDetails:basketItemsDetails, orderHistory: orders});
}

exports.getParentOrder = async function(req,res)
{
    var account = req.user;
    var orderNumber = req.query.orderNumber;
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    var orderDetails = await getOrderDetailsForOrderNumber(orderNumber);
    var deliveryOption = await models.deliveryOption.findOne();
    res.render('parentOrder', {user:account, basketItemsDetails:basketItemsDetails, order: orderDetails, deliveryOption:deliveryOption, refunds:[]});
}

exports.getAdminOrder = async function(req,res)
{
    var orderNumber = req.query.orderNumber;
    var orderDetails = await getOrderDetailsForOrderNumber(orderNumber);
    var deliveryOption = await models.deliveryOption.findOne();
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('newAdminOrder', {user:req.user, ordersNotShipped:ordersNotShipped, order: orderDetails, backgroundSetting:backgroundSetting,
         deliveryOption:deliveryOption, refunds:[], schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction});
}

exports.getOrdersForClassId = async function(classId)
{
    var orderedKids = await models.sequelize.query('select distinct pb.*, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from kids k ' + 
    ' inner join classes c on k.classFk = c.id ' + 
    ' inner join schools s on c.schoolFk = s.id ' + 
    ' inner join productItems pi on pi.kidFk = k.id ' +
    ' inner join basketitems b on b.productItemFk = pi.id ' + 
    ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
    ' where c.id = :classId ' + 
    ' and k.deleteFl = false ' +
    ' and pb.status = :completed ',
    {replacements:{classId:classId, completed:'Completed'},type:models.sequelize.QueryTypes.SELECT});

    return orderedKids;
}

async function getOrderDetailsForOrderNumber(orderNumber)
{
    var order = await models.purchaseBasket.findOne({
        where:{
            orderNumber:orderNumber
        }
    });

    if(order.shippingAddressFk == null)
        return await models.sequelize.query('select distinct b.id as basketItemId, b.*, a.accountNumber,  b.text1 as basketItemText1, pi.*, pv.name as productVariantName, pv.price, p.name as productName, pb.*,DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchasedDttm, pb.id as purchaseBasketId from basketItems b ' + 
                    ' inner join productItems pi on b.productItemFk = pi.id ' + 
                    ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                    ' inner join products p on pv.productFk = p.id ' + 
                    ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' + 
                    ' inner join accounts a on pi.accountFk = a.id '+
                    ' where pb.status = :completed ' + 
                    ' and pb.orderNumber = :orderNumber', {replacements:{completed:'Completed', orderNumber: orderNumber},
                    type: models.sequelize.QueryTypes.SELECT});
    else
        return await models.sequelize.query('select distinct b.id as basketItemId, b.*,a.accountNumber,  b.text1 as basketItemText1, pi.*, pv.name as productVariantName, pv.price, p.name as productName, pb.*,DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchasedDttm, s.*, pb.id as purchaseBasketId  from basketItems b ' + 
                ' inner join productItems pi on b.productItemFk = pi.id ' + 
                ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                ' inner join products p on pv.productFk = p.id ' + 
                ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' + 
                ' inner join shippingAddresses s on pb.shippingAddressFk = s.id ' +
                ' inner join accounts a on pi.accountFk = a.id '+
                ' where pb.status = :completed ' + 
                ' and pb.orderNumber = :orderNumber', {replacements:{completed:'Completed', orderNumber: orderNumber},
                type: models.sequelize.QueryTypes.SELECT});

}

exports.getOrdersForAccountId = async function(accountId)
{
    return await getOrdersForAccountId(accountId);
}

async function getOrdersForAccountId(accountId)
{
    return await models.sequelize.query('select distinct pb.* from basketItems b ' + 
                        ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' + 
                        ' where pb.status = :completed ' +
                        ' and b.accountFk = :accountId', {replacements:{completed:'Completed', accountId: accountId},
                type: models.sequelize.QueryTypes.SELECT});
    
}

exports.purchase = async function(req,res) {
    // transaction history page 
    var total = req.body.total;
    var subTotal = req.body.subTotal;
    var purchaseTotal = total / 100;
    var basketItemIds = req.body.items;
    var isShipping = req.body.isShipping;
    var deliveryName = req.body.deliveryName;
    var deliveryPrice = req.body.deliveryPrice;
    var url = req.body.url;

    var shippingId = await handleShippingDetails(isShipping,req);

    const purchaseBasket = await basketUtility.createPurchaseBasket(PURCHASE_BASKET_STATUS.PENDING, 
        purchaseTotal, subTotal, deliveryPrice, deliveryName, shippingId);
    

    basketItemIds = basketItemIds.split('\'').join('');
    basketItemIds = JSON.parse(basketItemIds);
    console.log(basketItemIds);
    await basketUtility.setBasketItemsToPurchaseBasketId(purchaseBasket.id, basketItemIds);

           
            models.sequelize.query('select b.*, pv.name as productVariantName, p.name as productName, pv.price from basketItems b ' + 
            ' inner join productItems pi on b.productItemFk = pi.id ' +
            ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
            ' inner join products p on pv.productFk = p.id ' +
            ' where b.id in (:basketItems) ', {replacements:{basketItems:basketItemIds}, type:models.sequelize.QueryTypes.SELECT})
                .then( async basketItems=>{
                    var lineItems = new Array();
                    
                    basketItems.forEach(basketItem=>{
                       var amount = (parseFloat(basketItem.price)) * 100;
                       var lineItem = {name:basketItem.productName + '-' + basketItem.productVariantName,amount:amount,currency:'gbp',quantity:basketItem.quantity};
                       lineItems.push(lineItem);
                    })

                    if( (isShipping == 'true'))
                    {
                        var amount = (parseFloat(deliveryPrice)) * 100;
                        var lineItem = {name:deliveryName, amount:amount, currency:'gbp',quantity:1};
                        lineItems.push(lineItem);
                    }
                    const urlPrefix = url;
                    const session = await stripe.checkout.sessions.create({
                        payment_method_types: ['card'],
                        line_items: lineItems,
                        customer_email:req.user.email,
                         client_reference_id:purchaseBasket.id,
                        success_url: urlPrefix + '/purchaseSuccessful',
                        cancel_url: urlPrefix +'/basket',
                      });
                
                    console.log(session.id);
                    res.json({session:session});
   
                }) 

}

exports.sessionCompleted = async function(req,res)
{
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
      console.log(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  
  if (event.type === 'checkout.session.completed')
  {
    const session = event.data.object;
    // console.log(event.data);
    // console.log(session.client_reference_id);
    var purchaseBasketId = session.client_reference_id;

    var now = new Date();
    var basketItemsDetails = await basketController.getBasketItemsDetailsForPurchaseBasketId(purchaseBasketId);

    var transaction = await models.sequelize.transaction();

    try
    {
        await models.purchaseBasket.update({
            status:'Completed',
            orderNumber:'blu-' + purchaseBasketId,
            purchaseDttm:now
        },
        {
            where:{
                    id:purchaseBasketId
                }
        }, transaction);
    }
    catch(err)
    {
        console.log(err);
        await transaction.rollback();

        throw 'purchasebasket update for orderNumber ' + 'blu-' + purchaseBasketId + ' failed';
    }

    await transaction.commit();
    await updateClassForPurchasedItems(basketItemsDetails.basketItems);
    var purchaseDttm = now;
    var month =purchaseDttm.getMonth() + 1;
    month = month <10 ? '0' + month : month;
    var days = purchaseDttm.getDate();
    days = days <10 ? '0' + days : days;
    var years = purchaseDttm.getFullYear();

    var hours = purchaseDttm.getHours();
    hours = hours < 10 ? '0' +hours :hours;
    var minutes = purchaseDttm.getMinutes();
    minutes = minutes < 10 ? '0' +minutes : minutes;
    var seconds = purchaseDttm.getSeconds();
    seconds = seconds < 10 ? '0' + seconds : seconds;

    var time = hours + ':' + minutes + ':' + seconds;
    purchaseDttm = years + '-' + month + '-' + days;

    var purchaseBasket = await models.purchaseBasket.findOne({
        where:{
            id:purchaseBasketId
        }
    });
    var total = purchaseBasket.total;
    total = (parseFloat(total)).toFixed(2);
     
    
    // await sendPurchaseEmail(false, basketItemsDetails.basketItems, 'blu-' + purchaseBasketId, purchaseDttm, total, time);
    await queueController.addPurchaseEmailJob('purchaseEmail',basketItemsDetails.basketItems, 'blu-' + purchaseBasketId, purchaseDttm,total,time);
    await queueController.addPurchaseEmailJob('purchaseEmailToBluwave',basketItemsDetails.basketItems, 'blu-' + purchaseBasketId, purchaseDttm,total,time);
               
    console.log(total);
    console.log(time)
    res.json({received: true});
            
  }
   
}

async function updateClassForPurchasedItems(basketItemsDetails)
{
    var productItemsWithClass = new Array();
    var productItemsWithoutClass = new Array();

    basketItemsDetails.forEach(item => {

        if(item.classFk == null)
            productItemsWithoutClass.push(item);
        else
            productItemsWithClass.push(item);

    });

    if(productItemsWithClass.length == 0)
        return;

    if(productItemsWithoutClass.length == 0)
        return;

    var classId = productItemsWithClass[0].classFk;

    for(var i = 0; i < productItemsWithoutClass.length; i++)
    {
        var item = productItemsWithoutClass[i];

        await models.productItem.update({
            classFk: classId
        },{
            where:{
                id: item.productItemId  
            }
        })
    }
}

async function handleShippingDetails(isShipping,req)
{
    if(isShipping == 'true')
    {
        var line1 = req.body.line1;
        var line2 = req.body.line2;
        var city = req.body.city;
        var postCode = req.body.postCode;
        var fullName = req.body.fullName;
        var countryId = req.body.country;

        return await models.shippingAddress.findOne({
            where:{
                        addressLine1:line1,
                        addressLine2:line2,
                        city:city,
                        postCode:postCode,
                        fullName:fullName,
                        countryFk:countryId
                    }
        }).then( async shippingAddress=>{

            if(shippingAddress == null)
            {
                shippingAddress = await models.shippingAddress.create({
                        // purchaseBasketFk:purchaseBasket.id,
                        addressLine1:line1,
                        addressLine2:line2,
                        city:city,
                        postCode:postCode,
                        fullName:fullName,
                        accountFk:req.user.id,
                        countryFk:countryId
                    });
            }

            return shippingAddress.id;

            
        })
    }
    else
        return null;
} 

exports.purchaseSuccessful = async function(req,res) {
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(req.user.id);
    res.render('purchaseSuccessful2', {user:req.user, basketItemsDetails:basketItemsDetails});
}

exports.getTotalOrderDetails = async function()
{
    var result = await models.sequelize.query('select count(id) as numberOfOrders, if(sum(subTotal) is null, 0, sum(subTotal)) as subTotal ,if(sum(total) is null, 0, sum(total)) as total from purchaseBaskets ' + 
        ' where status = :completed ',
        {replacements:{completed: 'Completed'}, type: models.sequelize.QueryTypes.SELECT});

    return result.length == 0 ? {numberOfOrders:0, total: 0} : result[0];
}

exports.getTopFivePerformingProductVariants = async function()
{
    return await models.sequelize.query("select p.displayImagePath, p.name as productName, pv.name as productVariantName, pv.price,  sum(b.quantity) as totalQuantity, " +
        " sum(b.cost) as cost from products p " +
        " inner join productVariants pv on pv.productFk = p.id " +
        " inner join productItems pi on pi.productVariantFk = pv.id " +
        " inner join basketItems b on b.productItemFk = pi.id " +
        " inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id " +
        " where pb.status = :completed " + 
        " group by pv.id having totalQuantity > 0 " +
        " order by totalQuantity desc limit 5 ", {replacements:{completed:'Completed'}, type: models.sequelize.QueryTypes.SELECT}).catch(err=>{
                console.log(err)
        });
        
}

exports.getOrderDetailsGroupByTypeForId = async function(purchaseBasketId, job)
{
    // list of cards
    // list of calendars
    // order form
    var progress = 1;
    job.progress(progress);

    var calendars = await models.sequelize.query('select distinct b.* from purchasebaskets pb ' +
                    ' inner join basketItems b on b.purchaseBasketFk = pb.id ' +
                    ' inner join productItems pi on b.productItemFk = pi.id ' +
                    ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
                    ' inner join products p on pv.productFk = p.id ' +
                    ' inner join productTypes pt on p.productTypeFk = pt.id ' +
                    ' where pb.status = :completed ' +
                    ' and pt.type = :calendars ' + 
                    ' and pb.id = :id ', {replacements:{completed:'Completed', id: purchaseBasketId, calendars: 'Calendars'},
                    type: models.sequelize.QueryTypes.SELECT});
    
    var cards = await models.sequelize.query('select distinct b.* from purchasebaskets pb ' +
                    ' inner join basketItems b on b.purchaseBasketFk = pb.id ' +
                    ' inner join productItems pi on b.productItemFk = pi.id ' +
                    ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
                    ' inner join products p on pv.productFk = p.id ' +
                    ' inner join productTypes pt on p.productTypeFk = pt.id ' +
                    ' where pb.status = :completed ' +
                    ' and pt.type = :cards ' + 
                    ' and pb.id = :id ', {replacements:{completed:'Completed', id: purchaseBasketId, cards: 'Christmas Cards'},
                    type: models.sequelize.QueryTypes.SELECT});
    
    progress++;
    job.progress(progress);

    const s3 = new aws.S3();
    var params = {
        Bucket:process.env.bucketName,
    };
                
    var path = null;

    if(cards.length > 0)
        path = await classController.downloadPurchasedFiles(cards[0], params, 0, s3);

    if(cards.length > 1)
    {
        var files = new Array();
        var now = Date.now();
        files = await classController.asyncForEachDownload(cards,classController.downloadPurchasedFiles,params,files,s3);

        path = process.cwd() + '/tmp/'  + now + purchaseBasketId + '_purchased.pdf';
        await PDFMerge(files, {output: path});
        files.forEach(file=>{
            fs.unlink(file);
        });
    }

    progress++;
    job.progress(progress);

    var path2 = null;

    if(calendars.length > 0)
        path2 = await classController.downloadPurchasedFiles(calendars[0], params, 0, s3);


    if(calendars.length > 1)
    {
        var files = new Array();
        var now = Date.now();
        files = await classController.asyncForEachDownload(calendars,classController.downloadPurchasedFiles,params,files,s3);

        path2 = process.cwd() + '/tmp/'  + now + purchaseBasketId + '_calendars_purchased.pdf';

        await PDFMerge(files, {output: path2});
        files.forEach(file=>{
            fs.unlink(file);
        });
    }

    progress++;
    job.progress(progress);

    var dir = './tmp/' + now + purchaseBasketId + '_purchases';

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    if(path != null)
    {
        fs.rename(path, dir + '/cards.pdf', function (err) {
            if (err) throw err
        });
    }
 
    if(path2 != null)
    {
        fs.rename(path2, dir + '/calendars.pdf', function (err) {
            if (err) throw err
        })
    }
    
    var now = Date.now();
    const archive = archiver('zip', { zlib: { level: 9 }});
    var fileName = 'tmp/' + purchaseBasketId + '_' + now + 'purchase_result.zip'
    const stream = fs.createWriteStream(fileName);

    var archivePromise = new Promise((resolve, reject) => {
        archive.directory(dir, false).on('error', err => reject(err)).pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });

    await archivePromise;

    progress++;
    job.progress(progress);

    var s3Stream = fs.createReadStream(fileName);
    params = {
        Bucket:process.env.bucketName,
        Body: s3Stream,
        Key: fileName,
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
    await stream.on('close', () => resolve());

    progress++;
    job.progress(progress);

    return {pdfPath:process.env.s3BucketPath + fileName};
}

exports.generateOrderDetails = async function(req,res)
{
    var purchaseBasketId = req.body.purchaseBasketId;
    
    var job = await queueController.generateOrderDetailsJob(purchaseBasketId);

    res.json({id:job.id});
}



exports.getSearchOrders = async function(req,res)
{
    var orderNumber = req.body.orderNumber;
    var name = req.body.name;
    var code = req.body.code;
    var school = req.body.school;
    var schoolClass = req.body.schoolClass;
    var date = req.body.date;

    var result = await models.sequelize.query('select distinct p.id, DATE_FORMAT(p.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm, p.orderNumber,p.total, k.name, k.code, s.name as schoolName, c.name as className from purchaseBaskets p ' + 
    ' inner join basketitems b on b.purchaseBasketFk = p.id ' + 
    ' inner join productItems pi on b.productItemFk = pi.id ' +
    ' inner join kids k on  pi.kidFk = k.id ' + 
    ' inner join classes c on k.classFk = c.id ' + 
    ' inner join schools s on c.schoolFk = s.id ' + 
    ' inner join shippingAddresses sh on p.shippingAddressFk = sh.id ' +
    ' where p.status = :completed ' + 
    ' and k.name like  :name ' +
    ' and k.code like :code ' + 
    ' and s.name like :school ' + 
    ' and c.name like :schoolClass ' + 
    ' and p.purchaseDttm like :date ' + 
    ' and p.orderNumber like :orderNumber order by p.purchaseDttm desc',
    {replacements:{ 
        name: '%'+ name + '%',
        code: '%'+ code + '%',
        school: '%'+ school + '%',
        schoolClass: '%'+ schoolClass + '%',
        orderNumber: '%'+ orderNumber + '%',
        date: '%'+ date + '%',
        completed: 'Completed'
    },type:models.sequelize.QueryTypes.SELECT});

    var result2s = await models.sequelize.query('select distinct p.id, DATE_FORMAT(p.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm,p.total, p.orderNumber, k.name, k.code, s.name as schoolName, c.name as className from purchaseBaskets p ' + 
      ' inner join basketitems b on b.purchaseBasketFk = p.id ' + 
      ' inner join productItems pi on b.productItemFk = pi.id ' +
      ' inner join kids k on pi.kidFk = k.id ' + 
      ' inner join classes c on k.classFk = c.id ' + 
      ' inner join schools s on c.schoolFk = s.id ' + 
      ' where p.status = :completed ' + 
      ' and k.name like  :name ' +
      ' and k.code like :code ' + 
      ' and s.name like :school ' + 
      ' and c.name like :schoolClass ' + 
      ' and p.purchaseDttm like :date ' + 
      ' and p.shippingAddressFk is null ' +
      ' and p.orderNumber like :orderNumber order by p.purchaseDttm desc',
      {replacements:{ 
          name: '%'+ name + '%',
          code: '%'+ code + '%',
          school: '%'+ school + '%',
          schoolClass: '%'+ schoolClass + '%',
          orderNumber: '%'+ orderNumber + '%',
          date: '%'+ date + '%',
          completed: 'Completed',
          false:false
      },type:models.sequelize.QueryTypes.SELECT});
  
    result2s.forEach(result2=>{
        result.push(result2);
    })

    var result3s = await models.sequelize.query('select distinct p.id,  DATE_FORMAT(p.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm,p.total, p.orderNumber from purchaseBaskets p ' + 
          ' inner join basketitems b on b.purchaseBasketFk = p.id ' + 
          ' inner join productItems pi on b.productItemFk = pi.id ' +
          ' where p.status = :completed ' + 
          ' and p.purchaseDttm like :date ' + 
          ' and pi.kidFk is null ' +
          ' and p.orderNumber like :orderNumber order by p.purchaseDttm desc',
          {replacements:{ 
            orderNumber: '%'+ orderNumber + '%',
            date: '%'+ date + '%',
            completed: 'Completed',
          },type:models.sequelize.QueryTypes.SELECT});

    result3s.forEach(result3=>{
        result.push(result3);
    });

    return res.json({result:result});
    
}

exports.getSubTotalOfAllOrdersToday = async function()
{
    var result =  await models.sequelize.query('select sum(subTotal) as subTotal from purchaseBaskets ' +
                ' where status = :completed ' +
                ' and purchaseDttm > CURDATE() ', 
                {replacements:{completed:'Completed'}, type:models.sequelize.QueryTypes.SELECT});
    return result[0].subTotal == null ? 0.00 : (result[0].subTotal).toFixed(2);

}

exports.getAverageTimeFromSignUpToPurchaseInMinutes = async function()
{
    var result = await models.sequelize.query('select avg(TIMESTAMPDIFF(minute, a.created_at, pb.purchaseDttm)) as average from accounts a ' +
        ' inner join basketitems b on b.accountFk = a.id ' +
        ' inner join purchasebaskets pb on b.purchasebasketFk = pb.id ' +
        ' where pb.status = :completed ',
        {replacements:{completed:'Completed'}, type:models.sequelize.QueryTypes.SELECT});

    return result[0].average == null ? 0 : parseFloat(result[0].average).toFixed(2);
}

exports.getNumberOfOrdersToday = async function()
{
    var result = await models.sequelize.query('select distinct count(id) as numberOfOrdersToday from purchasebaskets where status = :completed ' +
            ' and purchaseDttm > curdate()',
            {replacements:{completed:'Completed'}, type:models.sequelize.QueryTypes.SELECT});

    return result[0].numberOfOrdersToday == null ? 0 : (result[0].numberOfOrdersToday);
}