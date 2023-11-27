const models = require('../models');
const dadController = require('../controllers/DadController');
const productController = require('../controllers/ProductController');
const classController = require('../controllers/ClassController');
const orderController = require('../controllers/OrderController');
const accountUtility = require('../utility/account/accountUtility');
const queueController = require('../controllers/QueueController');
const schoolUtility = require('../utility/school/schoolUtility');
const kidUtility = require('../utility/kid/kidUtility');
const classUtility = require('../utility/class/classUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');

exports.getKidsFromAccountId = async function(accountId)
{
    var kids1 =  await models.sequelize.query('select distinct k.*, pi.*, p.productNumber, pi.productItemNumber, pi.productVariantFk as productVariantId from kids k ' +
                        ' inner join productitems pi on pi.kidfk = k.id ' +
                        ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
                        ' inner join products p on pv.productFk = p.id ' +
                        ' where pi.id = (select pi2.id from productitems pi2 inner join productVariants pv on pi2.productVariantFk = pv.id where pi2.kidFk = k.id and pv.orderNo =1 limit 1) ' +
                        ' and pi.accountFk = :accountId', {replacements:{accountId:accountId},
                type:models.sequelize.QueryTypes.SELECT});

    return kids1;
}

exports.getKidsFromAccountIdAndProductId = async function(accountId, productId)
{
    var kids1 =  await models.sequelize.query('select distinct k.*, pi.*, p.productNumber, pi.productItemNumber, pi.productVariantFk as productVariantId from kids k ' +
                        ' inner join productitems pi on pi.kidfk = k.id ' +
                        ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
                        ' inner join products p on pv.productFk = p.id ' +
                        ' where pi.id = (select pi2.id from productitems pi2 inner join productVariants pv on pi2.productVariantFk = pv.id where pi2.kidFk = k.id and pv.orderNo =1 limit 1) ' +
                        ' and pi.accountFk = :accountId ' +
                        ' and p.id = :productId ', {replacements:{accountId:accountId, productId:productId},
                type:models.sequelize.QueryTypes.SELECT});

    return kids1;
}

exports.getKidFromAccountId = async function(accountId)
{
    return await getKidFromAccountId(accountId);
}

async function getKidFromAccountId(accountId)
{
    return await models.kid.findOne({
        where:{
            parentAccountFk: accountId,
            deleteFl: false
        }
    });
}

exports.getKidsFromClassId = async function(classId)
{
    return await models.kid.findAll({
        where:{
            classFk:classId,
            deleteFl: false
        }
    })
}

exports.isKidLinkedToAccountId = async function(accountId)
{
    return await isKidLinkedToAccountId(accountId);
}

async function isKidLinkedToAccountId(accountId)
{
    var kid = await getKidFromAccountId(accountId);

    return kid != null;
}

exports.linkKid = async function(req,res) {
    var account = req.user;
    var month = req.query.month;
    var age = req.query.age;
    var name = req.query.name;
    var code = req.query.code;

    var isKidLinkedToAccount = await isKidLinkedToAccountId(account.id);
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

   
    res.render('linkKid3',{user:req.user,basketItemsDetails:basketItemsDetails, isKidLinkedToAccount:isKidLinkedToAccount, 
        accountLinkedByAdmin:req.query.accountId, name:name,age:age,month:month,code:code });
    
}

exports.createNewCard = async function(req,res)
{
    var basket = req.body.basket;
    var job = await queueController.linkKidJob('John Doe', 5, 0, null, req.user);
    console.log("jobid " + job.id)
    return res.json({id:job.id, basket:basket});
}

exports.processLinkKids = async function(req,res) {
    var account = req.user;
    var months = req.body.months;
    var years = req.body.years;
    var name = req.body.name;
    var classCode = req.body.classCode;
    var basket = req.body.basket;

    months = (months == '') ? 0 : months;
    var classAndSchool = await classUtility.getClassAndSchoolByClassNumber(classCode);

    if(classAndSchool == null)
    {
        var errors = {
            code: "The class code or school code you entered is not valid, please make sure you have entered the codes correctly"
        }
        // error
        return res.json({errors:errors});
    } 

    var job = await queueController.linkKidJob(name, years, months, classAndSchool.classId, account);
    console.log("jobid " + job.id)
    return res.json({id:job.id, basket:basket});
    // var kid = await createKid(name, years, months, classAndSchool.classId, account);
    // var product = await productController.getProductByName('Original Theme');
    // res.json({kidCode:kid.code, product:product, accountType: account.accountTypeFk, basket:basket});
    
}

exports.createKid = async function(name,years,months, classId, account)
{
    return await createKid(name,years,months,classId, account);
}

async function createKid(name, years, months, classId, account)
{
    var t = await models.sequelize.transaction();

    var code = await getNewKidCode();
    var kid = null;
    try {
        kid = await kidUtility.createKid(name, years, months, classId, account.id, code);
    } catch(error) {
        console.log(error);
        return await t.rollback();
    }
    
    await t.commit();

    return kid;
}

async function getNewKidCode()
{
    var code = dadController.makeCode();

    var kid = await models.kid.findOne({
        where:{
            code: code
        }
    });

    if(kid == null)
        return code;
    
    return await getNewKidCode();
}

exports.getKidByCode =  async function(code)
{
    return await getKidByCode(code);
}


async function getKidByCode(code)
{
    return await models.kid.findOne({
        where:{
            code: code,
            deleteFl: false
        }
    });
}

exports.getKidById =  async function(id)
{
    return await models.kid.findOne({
        where:{
            id: id
        }
    });
}

exports.isAccountLinkedToASchoolInScheme = async function(accountId)
{
    var kidsPartOfSchoolScheme = await models.sequelize.query('select k.* from accounts a ' + 
                    ' inner join kids k on k.parentAccountFk = a.id ' + 
                    ' where k.classFk is not null ' + 
                    ' and k.deleteFl = false ' + 
                    ' and a.id = :accountId', {replacements:{accountId:accountId},type: models.sequelize.QueryTypes.SELECT});

    return kidsPartOfSchoolScheme.length != 0;
}

exports.getKidClassAndSchoolFromKidId = async function(kidId)
{
    var result = await models.sequelize.query('select s.name as school, c.name as class from kids k ' + 
                    ' inner join classes c on k.classFk = c.id ' + 
                    ' inner join schools s on c.schoolFk = s.id ' + 
                    ' where k.id = :kidId', {replacements:{kidId:kidId}, type:models.sequelize.QueryTypes.SELECT});
    console.log(result)
    return result.length == 0 ? null : result[0];
}

exports.getKidsByClassId = async function(classId)
{
    return await models.kid.findAll({
        where:{
            classFk: classId,
            deleteFl: false
        }
    })
}

exports.getKidsForAccountId = async function(accountId)
{
    return await models.kid.findAll({
        where:{
            parentAccountFk:accountId,
            deleteFl: false
        }
    })
}
exports.getKidsForProductAndAccount = async function(productId, accountId)
{
    return await models.sequelize.query('select distinct k.*, pi.productItemNumber, pv.id as productVariantId from productItems pi ' + 
                        ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
                        ' inner join kids k on pi.kidFk = k.id ' +
                        ' where pv.productFk = :productId ' + 
                        ' and pi.accountFk = :accountId ' + 
                        ' and pv.orderNo = 1',
                        {replacements:{productId:productId, accountId:accountId}, type: models.sequelize.QueryTypes.SELECT});
}

exports.getAccountIdForKidNumber = async function(req,res)
{
    var kidNumber = req.query.kidNumber;
    
    var kid = await getKidByCode(kidNumber);
    var accountId = kid.parentAccountFk;

    res.json({accountId:accountId});
}

exports.getKidProductItemsScreen = async function(req,res)
{
    var kidNumber = req.query.kidNumber;

    var kid = await getKidByCode(kidNumber);
    var schoolClass = await classController.getClassById(kid.classFk);
    var school = (schoolClass == null) ? null : await schoolUtility.getSchoolFromSchoolId(schoolClass.schoolFk);
    var productItems = await productController.getProductItemsForKidNumber(kidNumber);
    var accountId = kid.parentAccountFk;
    var orders = await orderController.getOrdersForAccountId(accountId);
    var account = await accountUtility.getAccountById(accountId);
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('kidProductItems', {user:req.user, productItems:productItems, backgroundSetting:backgroundSetting, kid:kid, school:school,
            schoolClass:schoolClass, schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction, ordersNotShipped:ordersNotShipped, orderHistory:orders, account:account});
}

exports.handleLinkKid = async function(name, years, months, classId, account, job)
{
    var kid = await createKid(name, years, months, classId, account);
    var product = await productController.getProductByName('Create Your Own Card');
    var productItems = await productController.createProductItems(product,kid.code,account);
    job.progress(1);

    return {productItem:productItems[0], product:product};
}

exports.linkKidJob = async function(req,res)
{
    let id = req.query.id;
    let job = await queueController.getJobId(id);
  
    if (job === null) {
      res.status(404).end();
    } else {
      let state = await job.getState();
      let progress = job._progress;
      let reason = job.failedReason;
      let result = (job.returnvalue == null) ? undefined : job.returnvalue;
      let process = job.data.process;
      console.log('result ' + result);
      res.json({ id, state, progress, reason, result, process });
    }
}

exports.getNumberOfLinkedKids = async function()
{
    var result = await models.sequelize.query('select count(k.id) as count from kids k ' +
            ' inner join classes c on k.classFk = c.id ',
            {type:models.sequelize.QueryTypes.SELECT});
    return result[0].count;
}
