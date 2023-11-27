const models = require('../models');
var dadController = require('../controllers/DadController');
var productController = require('../controllers/ProductController');
var kidController = require('../controllers/KidController');
var classController = require('../controllers/ClassController');
var accountUtility = require('../utility/account/accountUtility');
var orderController = require('../controllers/OrderController');
const schoolUtility = require('../utility/school/schoolUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');

exports.getAdminDashboardPage = async function(req,res)
{
    var orderDetails = await orderController.getTotalOrderDetails();
    var numberOfCustomers = await accountUtility.getNumberOfCustomers();
    var giveBackDetails = await schoolUtility.getGiveBackAmount();
    var numberOfSchools = await schoolUtility.getNumberOfSchools();
    var schoolDashboardStatus = await schoolUtility.getSchoolDashboardStatus();
    var schoolProgressDetails = await schoolUtility.getSchoolProgressDetails();
    var topFivePerformingProductVariants = await orderController.getTopFivePerformingProductVariants();
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var numberOfLinkedKids = await kidController.getNumberOfLinkedKids();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();
    var subTotalToday = await orderController.getSubTotalOfAllOrdersToday();
    var averageTimeFromSignUpToPurchaseInMinutes = await orderController.getAverageTimeFromSignUpToPurchaseInMinutes();
    var numberOfSignUpsToday = await accountUtility.getNumberOfSignUpsToday();
    var numberOfOrdersToday = await orderController.getNumberOfOrdersToday();

    res.render('adminDashboard', {user:req.user, numberOfCustomers:numberOfCustomers, schoolDashboardStatus:schoolDashboardStatus,
         orderDetails:orderDetails, giveBackDetails: giveBackDetails, numberOfSchools:numberOfSchools, backgroundSetting: backgroundSetting,
         schoolProgressDetails:schoolProgressDetails, topFivePerformingProductVariants:topFivePerformingProductVariants,subTotalToday:subTotalToday,
         ordersNotShipped:ordersNotShipped, averageTimeFromSignUpToPurchaseInMinutes:averageTimeFromSignUpToPurchaseInMinutes, 
         numberOfLinkedKids:numberOfLinkedKids, schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction,
         numberOfSignUpsToday:numberOfSignUpsToday,numberOfOrdersToday:numberOfOrdersToday});
}

exports.getAdminAccountPage = async function(req,res)
{
    var accountTypes = await models.accountType.findAll({});
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('adminAccounts', {user: req.user, backgroundSetting: backgroundSetting,
         ordersNotShipped:ordersNotShipped, accountTypes:accountTypes, schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction});
}

exports.searchAccounts = async function(req,res)
{
    var name = req.body.name;
    var email = req.body.email;
    var accountType = req.body.accountType;
    var createdFromDt = req.body.createdFromDt;
    var createdToDt = req.body.createdToDt;
    var phoneNumber = req.body.phoneNumber;
    var accountNumber = req.body.accountNumber;

    var query = 'select a.accountNumber,a.id, a.name, a.email, a.telephoneNumber as telephone, at.accountType, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as createdDt from accounts a ' + 
    ' inner join accountTypes at on a.accountTypeFk = at.id ' +
    ' where (a.name like :name or a.name is null )' +
    ' and a.email like :email ' +
    ' and (a.telephoneNumber like :phoneNumber or a.telephoneNumber is null) ';

    if(accountType != '0')
        query = query + ' and a.accountTypeFk = :accountType ';

    if(createdFromDt != undefined)
        query = query + ' and a.created_at >= :createdFromDt ';

    if(createdToDt != undefined)
        query = query + ' and a.created_at <= :createdToDt ';
    
    query = query + ' order by a.created_at desc';

    await models.sequelize.query(query,
                {replacements:{name:'%' + name +'%',
                  email:'%'+email + '%',
                  accountType: accountType,
                  phoneNumber: '%' + phoneNumber + '%',
                  createdFromDt:'%' + createdFromDt + '%',
                  createdToDt:'%' + createdToDt + '%',
                  accountNumber: '%' + accountNumber +'%'},type:models.sequelize.QueryTypes.SELECT}).
                  then(accounts=>{

                      res.json({result:accounts});
                  })
}



exports.getProductItemScreen = async function(req,res)
{
    var productItemNumber = req.query.productItemNumber;
    var productItem = await productController.getProductItemByNumber(productItemNumber);
    productItem = productItem[0];
    var product = await productController.getProductById(productItem.productId);
    var productVariants = await productController.getProductVariantsForProductItemGroupId(productItem.productItemGroupFk);
    var productVariant = await productController.getProductVariantById(productItem.productVariantFk);
    var account = await accountUtility.getAccountById(productItem.accountFk);
    
    var kid = null;
    var schoolClass = null;
    var school = null;

    if(productItem.kidFk != null)
        kid = await kidController.getKidById(productItem.kidFk);

    if(kid != null && kid.classFk != null)
        schoolClass = await classController.getClassById(kid.classFk);

    if(schoolClass != null)
        school = await schoolUtility.getSchoolFromSchoolId(schoolClass.schoolFk);

    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('adminProductItem', {user:req.user,productItem:productItem, product:product, account:account, backgroundSetting:backgroundSetting,
        productVariants:productVariants, ordersNotShipped:ordersNotShipped, productVariant:productVariant,
        kid:kid, schoolClass:schoolClass, school:school, schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction});
}

exports.getAccountDetailsPage = async function(req,res)
{
    var number = req.query.number;
    var account = await accountUtility.getAccountByNumber(number);
    var productItems = await productController.getProductItemsForAccountNumber(number);
    var orders = await orderController.getOrdersForAccountId(account.id);
    var accountType = await models.accountType.findOne({
        where:{
            id:account.accountTypeFk
        }
    });

    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

    var kids = await kidController.getKidsForAccountId(account.id);
    var school = await schoolUtility.getSchoolFromAccountId(account.id);
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('adminAccountDetail', {user:req.user, account:account, basketItemsDetails:basketItemsDetails, ordersNotShipped:ordersNotShipped,
         kids:kids, productItems:productItems, backgroundSetting:backgroundSetting, orderHistory: orders, 
         accountType:accountType, school:school, schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction});
}

exports.getKidsSearchScreen = async function(req,res)
{
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('adminKids',{user:req.user,schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction,
         ordersNotShipped:ordersNotShipped, backgroundSetting:backgroundSetting})
}

exports.searchKidsResults = async function(req,res)
{
    var kidNumber = req.body.kidNumber;
    var name = req.body.name;
    var school = req.body.school;
    var schoolClass = req.body.schoolClass;
    
    var kids = [];

    if(schoolClass == '' && school == '')
    {
        kids = await models.sequelize.query('select * from kids ' + 
                ' where code like :kidNumber ' +
                ' and name like :name ' +
                ' and classFk is null ',
                {replacements:{
                    kidNumber:'%' + kidNumber + '%',
                    name: '%' + name + '%'    }, type: models.sequelize.QueryTypes.SELECT});
        
    }
    
    var schoolKids = await models.sequelize.query('select k.name, k.code , s.name as school, c.name as class from kids k ' + 
        ' inner join classes c on k.classFk = c.id ' + 
        ' inner join schools s on c.schoolFk = s.id ' +
        ' where k.code like :kidNumber ' +
        ' and k.name like :name ' + 
        ' and c.name like :schoolClass ' + 
        ' and s.name like :school ',
        {replacements:{
            kidNumber:'%' + kidNumber + '%',
            name: '%' + name + '%',
            schoolClass: '%' + schoolClass + '%',
            school: '%' + school + '%'    }, type: models.sequelize.QueryTypes.SELECT}).catch(err=>{
                console.log(err);
            });
    
    schoolKids.forEach(kid => {
        kids.push(kid);
    });
    
    res.json({result:kids});
}

exports.getOrdersSearchScreen = async function(req,res)
{
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('newAdminOrders', {user:req.user, ordersNotShipped:ordersNotShipped,
        schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction, backgroundSetting:backgroundSetting})
}

exports.searchOrdersResults = async function(req, res)
{
    var orderNumber = req.body.orderNumber;
    var kidName = req.body.kidName;
    var kidCode = req.body.kidCode;
    var school = req.body.school;
    var schoolClass = req.body.schoolClass;
    var fromDt = req.body.fromDt;
    var toDt = req.body.toDt;


    var orders = [];
    var query;
    if(schoolClass == '' && school == '')
    {
        query = 'select distinct pb.total, pb.orderNumber, pb.subTotal, k.name as kidName, k.code as kidCode,DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb ' + 
                ' inner join basketItems b on b.purchaseBasketFk = pb.id ' +
                ' inner join productItems pi on b.productItemFk = pi.id ' +
                ' inner join kids k on pi.kidFk = k.id ' +
                ' where pb.status = :completed ' + 
                ' and pb.orderNumber like :orderNumber ' +
                ' and k.name like :kidName ' +
                ' and k.code like :kidCode ' + 
                ' and k.classFk is null ';

        if(fromDt != '')
            query = query + ' and pb.purchaseDttm >= :fromDt ';

        if(toDt != '')
            query = query + ' and pb.purchaseDttm <= :toDt ';

        orders = await models.sequelize.query(query,
                {replacements:{
                    kidCode:'%' + kidCode + '%',
                    kidName: '%' + kidName + '%',
                    orderNumber: '%' + orderNumber + '%',
                    completed: 'Completed',
                    fromDt:fromDt,
                    toDt:toDt
                    }, type: models.sequelize.QueryTypes.SELECT});

        query = 'select distinct pb.total, pb.orderNumber, pb.subTotal, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb ' + 
            ' inner join basketItems b on b.purchaseBasketFk = pb.id ' +
            ' inner join productItems pi on b.productItemFk = pi.id ' +
            ' where pb.status = :completed ' + 
            ' and pb.orderNumber like :orderNumber ' +
            ' and pi.kidFk is null ';
    
        if(fromDt != '')
            query = query + ' and pb.purchaseDttm >= :fromDt ';

        if(toDt != '')
            query = query + ' and pb.purchaseDttm <= :toDt ';


        var orders2 = await models.sequelize.query(query,
                {replacements:{
                    orderNumber: '%' + orderNumber + '%',
                    completed: 'Completed',
                    fromDt:fromDt,
                    toDt:toDt
                    }, type: models.sequelize.QueryTypes.SELECT});
        
        orders2.forEach(o => {
            orders.push(o);
        })
    }

    query = 'select distinct pb.total, pb.subTotal,pb.orderNumber, k.name as kidName, k.code as kidCode, s.name as school, c.name as schoolClass, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb ' + 
        ' inner join basketItems b on b.purchaseBasketFk = pb.id ' + 
        ' inner join productItems pi on b.productItemFk = pi.id ' + 
        ' inner join kids k on pi.kidFk = k.id ' + 
        ' inner join classes c on k.classFk = c.id ' + 
        ' inner join schools s on c.schoolFk = s.id ' + 
        ' where pb.orderNumber like :orderNumber ' + 
        ' and k.name like :kidName ' + 
        ' and k.code like :kidCode ' + 
        ' and s.name like :school ' + 
        ' and c.name like :schoolClass ' + 
        ' and pb.status = :completed ';
    
    if(fromDt != '')
        query = query + ' and pb.purchaseDttm >= :fromDt ';

    if(toDt != '')
        query = query + ' and pb.purchaseDttm <= :toDt ';

    var schoolOrders = await models.sequelize.query(query,
        {replacements:{
            kidCode:'%' + kidCode + '%',
            kidName: '%' + kidName + '%',
            orderNumber: '%' + orderNumber + '%',
            completed: 'Completed',
            school: '%' + school + '%',
            schoolClass: '%' + schoolClass + '%',
            fromDt:fromDt,
            toDt:toDt
            }, type: models.sequelize.QueryTypes.SELECT});

    schoolOrders.forEach(order => {
        orders.push(order);
    });
            
    res.json({result:orders});
}

exports.setBackground = async function(req,res)
{
    var value = req.body.value;
    
    await models.setting.update({
        value:value,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where:{
            name: 'Background Color',
            accountFk: req.user.id
        }
    });

    res.json({});
}

exports.setShipped = async function(req,res)
{
  var purchaseBasketId = req.body.purchaseBasketId;

  await models.purchaseBasket.update({
        shippedFl:true,
        shippedDttm: Date.now(),
        verisonNo: models.sequelize.literal('versionNo + 1')
    },
    {
        where:{
        id:purchaseBasketId
        }
    });

    return res.json({});
}

exports.ordersNotShipped = async function(req,res)
{
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('ordersNotShipped',{user:req.user, backgroundSetting:backgroundSetting, 
        schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction, ordersNotShipped:ordersNotShipped});
}

exports.getKidsLinkedToSchoolScreen = async function(req,res)
{
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    var schoolDetails = await schoolUtility.getNumberOfKidsLinkedToEachSchool();

    res.render('linkedToSchools',{user:req.user,schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction,
         ordersNotShipped:ordersNotShipped, backgroundSetting:backgroundSetting, schoolDetails:schoolDetails})
}

exports.getRevenueChartScreen = async function(req,res)
{
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('revenueChart',{user:req.user,schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction,
        ordersNotShipped:ordersNotShipped, backgroundSetting:backgroundSetting});
}

exports.getRevenues = async function(req,res)
{
    var revenues = await models.sequelize.query('select distinct cast(purchaseDttm as date) as dates, sum(subtotal) as subTotal from purchasebaskets ' +
            ' where status = :completed ' +
            ' group by dates having sum(subtotal) > 0 ',
            {replacements:{completed:'Completed'}, type: models.sequelize.QueryTypes.SELECT});
    return res.json({revenues:revenues})
}

exports.getAccountsWithBasketItems = async function(req,res)
{
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    var accounts = await models.sequelize.query('select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at from basketitems b ' +
                        ' inner join accounts a on b.accountFk = a.id  where purchaseBasketfk is null ' +
                        ' order by a.created_at ', {type:models.sequelize.QueryTypes.SELECT});
                    
    var accounts2 = await models.sequelize.query('select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at from basketitems b ' +
                        ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' + 
                        ' inner join accounts a on b.accountFk = a.id ' +
                        ' where pb.status = :pending ', 
                        {replacements:{pending: 'Pending'},type:models.sequelize.QueryTypes.SELECT}); 
    accounts.push(...accounts2);

    console.log(accounts);
    var result = await models.sequelize.query('select sum(b.cost) as outstandingAmount from basketitems b ' +
                ' where purchaseBasketfk is null ', {type:models.sequelize.QueryTypes.SELECT}); 
    
    var outstandingAmount = result[0].outstandingAmount == null ? 0 : result[0].outstandingAmount;
    result = await models.sequelize.query('select sum(b.cost) as outstandingAmount from basketitems b ' +
                ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id where pb.status = :pending ', 
                {replacements:{pending: 'Pending'},type:models.sequelize.QueryTypes.SELECT}); 
    outstandingAmount = parseFloat(outstandingAmount) + parseFloat(result[0].outstandingAmount == null ? 0 : result[0].outstandingAmount);
    
    res.render('accountsWithBasketItems', {user:req.user,schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction,
        ordersNotShipped:ordersNotShipped, backgroundSetting:backgroundSetting, accounts:accounts,
        outstandingAmount:outstandingAmount})
}

exports.getAccountsLinkedNoOrder = async function(req,res)
{
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    var accounts = await models.sequelize.query('select distinct s.name as school, a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at  from productitems pi ' +
        ' inner join accounts a on pi.accountFk = a.id ' + 
        ' inner join classes c on c.id = pi.classFk ' +
        ' inner join schools s on c.schoolFk = s.id ' +
        ' where accountFk not in (select b.accountFk from purchasebaskets pb ' +
        ' inner join basketitems b on b.purchasebasketFk = pb.id ' +
        ' where pb.status = :completed )', {replacements:{completed:'Completed'},type:models.sequelize.QueryTypes.SELECT});

    res.render('accountsLinkedNoOrders', {user:req.user,schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction,
        ordersNotShipped:ordersNotShipped, backgroundSetting:backgroundSetting, accounts:accounts})
}

exports.getAccountsLinkedNoOrderButUploadedPicture = async function(req,res)
{
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    var accounts = await models.sequelize.query('select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at  from productitems pi ' +
            ' inner join accounts a on pi.accountFk = a.id where classFk is not null ' +
            ' and accountFk not in (select b.accountFk from purchasebaskets pb ' +
            ' inner join basketitems b on b.purchasebasketFk = pb.id ' +
            ' where pb.status = :completed ) and pi.picture1Path != :defaultPic ', {replacements:{completed:'Completed', defaultPic:'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Pictures/1665963540329_191.png'},
            type:models.sequelize.QueryTypes.SELECT});

    res.render('accountsLinkedNoOrdersButUploadedPicture', {user:req.user,schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction,
        ordersNotShipped:ordersNotShipped, backgroundSetting:backgroundSetting, accounts:accounts})
}

exports.updateOrderBasketItem = async function(req, res) {

    const basketItemId = req.body.basketItemId;
    const productItemNumber = req.body.productItemNumber;

    var productItem = await productController.getProductItemByNumber(productItemNumber);
    productItem = productItem[0];

    const path = productItem.pdfPath;
    const fileName = path.replace(process.env.s3BucketPath, '');
    const picture = productItem.picture1Path;

    await models.basketItem.update({
        path: path,
        fileName: fileName,
        picture: picture,
        verisonNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: basketItemId
        }
    });

    res.json({});

}