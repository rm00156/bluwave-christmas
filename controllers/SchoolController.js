const { sequelize } = require('../models');
const models = require('../models');
const dadController = require('./DadController');
const kidController = require('./KidController');
const adminController = require('./AdminController');
const statusController = require('./StatusController');
const basketController = require('./BasketController');
const classController = require('./ClassController');
const productController = require('./ProductController');
const queueController = require('./QueueController');
const confirmAmountValidator = require('../validators/confirmAmount');
const schoolController = require('./SchoolController');

exports.getSearchSchoolsPage = async function(req,res)
{
    var statusTypes = await getAllStatusTypes();
    var backgroundSetting = await adminController.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await adminController.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await getSchoolsRequiringGiveBackAction();

    res.render('newAdminSchools', {user:req.user,statusTypes:statusTypes, ordersNotShipped:ordersNotShipped,
         backgroundSetting:backgroundSetting, schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction})
}

getAllStatusTypes = async function()
{
    return await models.statusType.findAll({
        where:{
            deleteFl:false
        }
    });
}

exports.getSchoolPage = async function(req,res)
{

    const schoolNumber = req.query.number;

    // redo to account for steps where next step is null to now account for the waiting step
    var school = await models.sequelize.query('select s.*, a.email, a.accountNumber, sts.type, sts.id as typeId, sts.nextTypeFk  from schools s ' + 
    ' inner join statuses st on st.schoolFk = s.id ' +
    ' inner join statusTypes sts on st.statusTypeFk = sts.id ' +
    ' inner join accounts a on s.organiserAccountFk = a.id ' +
    ' where s.schoolNumber = :schoolNumber ' + 
    ' order by st.createdDttm desc, st.statusTypeFk desc LIMIT 1' , {replacements:{
        schoolNumber: schoolNumber,
    }, type: models.sequelize.QueryTypes.SELECT 
    });
    
    var school = school[0];
    var giveBackDetails = await getGiveBackAmount(school.id);
    var giveBackTotal = giveBackDetails == null ? 0.00 : giveBackDetails.giveBackTotal;
    var nextSteps = await getNextStepsForStatusType(school.nextTypeFk, school.typeId)
    
  
    var classes = await models.sequelize.query('select c.*, (select count(id) from kids where classFk = c.id) as kidTotal, y.year from classes c ' + 
    ' inner join schools s on c.schoolFk = s.id ' +
    ' inner join years y on c.yearFk = y.id ' +
    ' where s.schoolNumber = :schoolNumber ' + 
    ' order by c.name asc' , {replacements:{
        schoolNumber: schoolNumber,
    }, type: models.sequelize.QueryTypes.SELECT 
    });
    
    var classTotal = classes.length;
    var deadLine = await models.deadLine.findOne({
        where:{
          schoolFk:school.id
        }
      });

    var deadlineDetail = getDeadlineDetails(deadLine);
    var deadLineDttm = deadlineDetail.deadLineDttm;
    var daysLeft = deadlineDetail.daysLeft;
    var daysLeftSign = deadlineDetail.daysLeftSign;

    var orderDetails = await getOrderDetailsForAllKidsFromSchoolId(school.id);
    var backgroundSetting = await adminController.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await adminController.getOrdersNotShipped();
    var statusTypeDetails = await statusController.getStatusTypeDetailsForSchoolId(school.id);
    var schoolsRequiringGiveBackAction = await getSchoolsRequiringGiveBackAction();

    res.render('newSchoolDetail', {user:req.user,school:school,classList:classes, orderDetails:orderDetails, classTotal:classTotal,
                                                                deadLineDttm:deadLineDttm,daysLeft:daysLeft, daysLeftSign:daysLeftSign,
                                                                nextSteps:nextSteps, giveBackTotal:giveBackTotal, statusTypeDetails:statusTypeDetails,
                                                                backgroundSetting:backgroundSetting, ordersNotShipped:ordersNotShipped,
                                                                schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction});
}

exports.searchSchoolsResults = async function(req,res)
{
    var nameSearch = req.body.nameSearch;
    var addressSearch = req.body.addressSearch;
    var postCodeSearch = req.body.postCodeSearch;
    var emailSearch = req.body.emailSearch;
    var status = req.body.status;

    console.log(req.body)

    var result = await models.sequelize.query('select s.*, stp.type, a.created_at as school_createdDt from schools s' +
            ' inner join statuses st on st.schoolFk = s.id ' + 
            ' inner join statusTypes stp on st.statusTypeFk = stp.id ' + 
            ' inner join accounts a on s.organiserAccountFk = a.id ' +
            ' where s.name like :name ' + 
            ' and s.address like :address ' +
            ' and s.postCode like :postCode ' + 
            ' and stp.type like :status ' + 
            ' and s.email like :email ' + 
            ' and st.id = (select id from statuses where schoolFk = s.id order by createdDttm desc limit 1)',{replacements:{
                name: '%'+ nameSearch +'%',
                address: '%'+ addressSearch +'%',
                postCode: '%'+ postCodeSearch +'%',
                status: '%'+ status +'%',
                email: '%'+ emailSearch +'%'}, type: models.sequelize.QueryTypes.SELECT});

    res.json({result:result});
}

async function getNextStepsForStatusType(nextTypeId, currentStatusTypeId)
{
    var nextSteps = new Array();
    if(nextTypeId == null)
    {
        if(currentStatusTypeId == 6)
        {
          nextSteps.push({id:7,type:'Delay'});
          nextSteps.push({id:8,type:'Printing'});
        }
      
    }
    else
    {
     await models.statusType.findOne({
        where:{
            id: nextTypeId
        }
      }).then(statusType=>{
        nextSteps.push({id:nextTypeId,type:statusType.type})
      })
    }

    return nextSteps;
      
}

exports.getDeadlineDetails = function(deadLine)
{
    return getDeadlineDetails(deadLine);
}

exports.getDeadlineDetailsForSchoolId = async function(schoolId)
{
    var deadLine = await models.deadLine.findOne({
        where:{
          schoolFk:schoolId
        }
    });

    return getDeadlineDetails(deadLine);
}

function getDeadlineDetails(deadLine)
{
    var deadLineDttm = '';
    var daysLeft = undefined;
    var daysLeftSign = undefined;
    var now = Date.now();
    if(deadLine != null)
    {
        var unparsedDeadLine = deadLine.deadLineDttm;

        var month =unparsedDeadLine.getMonth() + 1;
        month = month <10 ? '0' + month : month;
        var days = unparsedDeadLine.getDate();
        days = days <10 ? '0' + days : days;
        var years = unparsedDeadLine.getFullYear();

        deadLineDttm = years + '-' + month + '-' + days;

        var unparsedDeadlineTime = unparsedDeadLine.getTime();
        daysLeft = unparsedDeadlineTime - now;
        daysLeft = daysLeft/(1000*60*60*24);
        
        if( daysLeft < 0 )
        {
        daysLeft = Math.ceil(daysLeft);
        if(daysLeft == 0 )
            daysLeftSign = 'zero';
        else
            daysLeftSign = 'negative';
        
        }
        else if ( daysLeft == 0 )
        {
        daysLeftSign = 'zero';
        }
        else
        {
        daysLeft = Math.ceil(daysLeft);
        if(daysLeft == 0 )
            daysLeftSign = 'zero';
        else
            daysLeftSign = 'postive';
        }
    }

    return {deadLineDttm:deadLineDttm, daysLeft:daysLeft,daysLeftSign:daysLeftSign}
}

exports.getSchoolFromAccountId = async function(accountId)
{
    return await models.school.findOne({
        where:{
            organiserAccountFk:accountId,
            deleteFl: false
        }
    });
}

exports.getSchoolFromSchoolId = async function(schoolId)
{
    return await getSchoolFromSchoolId(schoolId);
}

async function getSchoolFromSchoolId(schoolId)
{
    return await models.school.findOne({
        where:{
            id:schoolId,
            deleteFl: false
        }
    });
}

exports.getSchoolFromSchoolNumber = async function(schoolNumber)
{
    return await models.school.findOne({
        where:{
            schoolNumber:schoolNumber,
            deleteFl: false
        }
    });
}

exports.getAllKidsFromSchoolId = async function(schoolId)
{
    return await getAllKidsFromSchoolId(schoolId);
}

async function getAllKidsFromSchoolId(schoolId)
{
    return await models.sequelize.query('select k.* from kids k ' + 
                            ' inner join classes c on k.classFk = c.id ' + 
                            ' inner join schools s on c.schoolFk = s.id ' + 
                            ' where s.id = :schoolId ' +
                            ' and k.deleteFl = false ' ,
                            {replacements:{schoolId:schoolId},type:models.sequelize.QueryTypes.SELECT});
}

async function getOrderDetailsForAllKidsFromSchoolId(schoolId)
{
    var totalKidsArray = await getAllKidsFromSchoolId(schoolId);
    var totalKids = totalKidsArray.length;

    return await models.sequelize.query('select count(distinct pb.id) as orderCount from purchasebaskets pb ' +
                                        ' inner join basketItems b on b.purchaseBasketFk = pb.id ' +
                                        ' inner join productItems pi on b.productItemFk = pi.id ' +
                                        ' inner join classes c on pi.classFk = c.id ' +
                                        ' inner join schools s on c.schoolFk = s.id ' + 
                                        ' where s.id = :schoolId ' + 
                                        ' and pb.status = :completed ',
                                {replacements:{schoolId:schoolId, completed:'Completed'},type:models.sequelize.QueryTypes.SELECT}).then(orders=>{

                                    var details = {
                                        orderCount: orders[0].orderCount,
                                        totalKids: totalKids
                                    }

            return details;
    });
}

exports.getOrderDetailsForAllKidsFromSchoolId = async function(schoolId)
{
    return await getOrderDetailsForAllKidsFromSchoolId(schoolId);
}

exports.getClassesForSchoolId = async function(schoolId)
{
    return await models.class.findAll({
        where:{
            schoolFk: schoolId,
            deleteFl: false
        }
    })
}

exports.updateSchoolDetailsForSchoolId = async function(schoolId, schoolName,address,postCode,number,organiserName, additionalInfo, numberOfKidsPerClass)
{
    var t = await models.sequelize.transaction();
    
    try
    {
        await models.school.update({
            name:schoolName,
            address:address,
            postCode:postCode,
            number:number,
            additionalInfo: additionalInfo,
            numberOfKidsPerClass: numberOfKidsPerClass,
            versionNo: sequelize.literal('versionNo + 1')
        },{
            where:{
                id:schoolId
            }
        },t);

        var school = await getSchoolFromSchoolId(schoolId);

        await models.account.update({
            name:organiserName,
            telephoneNo: number,
            versionNo: sequelize.literal('versionNo + 1')
        },{
            where:{
                id:school.organiserAccountFk
            }
        }, t);
    }
    catch(err)
    {
        console.log(err);
        if(err)
            return await t.rollback()
    }
   
    t.commit();
   
}

exports.removeClass = async function(req,res)
{
    var classId = req.body.classId;
    var kids = await kidController.getKidsFromClassId(classId);

    if(kids.length > 0)
        return res.json({errors:[]});
    
    var t = await models.sequelize.transaction();

    try
    {
        await models.class.update({
            deleteFl: true
        },{
            where:{
                id:classId
            }
        }, t);
    }
    catch(err)
    {
        console.log(err);
        return await t.rollback();
    }

    await t.commit();

    res.json({});
}

exports.addNewClass = async function(req,res)
{
    var schoolId = req.body.schoolId;
    var className = req.body.className;

    var isValid = await isValidClassForSchool(schoolId,className);

    if(isValid)
    {
        var transaction = await models.sequelize.transaction();

        try
        {
            await createClass(className, schoolId, transaction)
        }
        catch(err)
        {
            await transaction.rollback();
            return console.log(err)
        }

        await transaction.commit();

        res.json({})
    }
    else
    {
        res.json({errors:[]})
    }
}

async function isValidClassForSchool(schoolId, className)
{
    var schoolClass = await models.class.findOne({
        where:{
            name:className,
            schoolFk:schoolId,
            deleteFl: false
        }
    })

    return schoolClass == null;
}

exports.createClass = async function(className, schoolId, t)
{
    return await createClass(className, schoolId, t);
}


async function createClass(className, schoolId, t)
{
    var classNumber = await generateClassNumber();

    await models.class.create({
        classNumber: classNumber,
        name: className,
        schoolFk: schoolId,
        yearFk : 31,
        deleteFl: false,
        versionNo: 1
    },{ transaction: t})
}

async function generateClassNumber()
{
    var classNumber = await dadController.makeCode();

    return models.class.findOne({
        where:{
            classNumber: classNumber
        }
    }).then(classs=>{

        if(classs == null)
            return classNumber;
        
        return generateClassNumber();
    })
}

exports.getSchoolFromBasketItemId = async function(basketItemId)
{
    var result = await models.sequelize.query('select distinct s.* from basketItems b ' + 
            ' inner join kids k on k.parentAccountFk = b.accountFk ' +
            ' inner join classes c on k.classFk = c.id ' + 
            ' inner join schools s on c.schoolFk = s.id ' + 
            ' where b.id = :basketItemId ', 
            {replacements:{basketItemId:basketItemId}, type: models.sequelize.QueryTypes.SELECT});

    return (result[0]);
}

async function getSchoolFromClassId(classId)
{
    var result = await models.sequelize.query('select s.* from schools s ' +
            ' inner join classes c on c.schoolFk = s.id ' + 
            ' where c.id = :classId ', 
            {replacements:{classId:classId}, type: models.sequelize.QueryTypes.SELECT});
    return result.length == 0 ? null : result[0];
}

exports.getSchoolDeadlineFromClassId = async function(classId)
{
    var result = await models.sequelize.query('select d.* from schools s ' +
            ' inner join classes c on c.schoolFk = s.id ' + 
            ' inner join deadlines d on d.schoolFk = s.id ' +
            ' where c.id = :classId ', 
            {replacements:{classId:classId}, type: models.sequelize.QueryTypes.SELECT});
    return result.length == 0 ? null : result[0];
}

exports.getSchoolFromClassId = async function(classId)
{
    return await getSchoolFromClassId(classId);
}

exports.getSchoolDeadlineBySchoolId = async function(schoolId)
{
    return await models.deadLine.findOne({
        where:{
            schoolFk:schoolId
        }
    });
}

exports.changeSchoolStep = async function(req,res)
{
    var schoolId = req.body.schoolId;
    var nextTypeFk = req.body.nextTypeFk;
    
    var statusDetail;
    if(nextTypeFk == '')
    {
      statusDetail = await models.sequelize.query('select stt.type, stt.nextTypeFk from schools s ' + 
                    ' inner join statuses st on st.schoolFk = s.id ' + 
                    ' inner join statusTypes stt on st.statusTypeFk = stt.id ' +
                    ' where s.id = :schoolId order by st.createdDttm desc limit 1 ',
                    {replacements:{schoolId:schoolId}, type: models.sequelize.QueryTypes.SELECT});
      statusDetail = statusDetail[0];
    }
    else
    {
      statusDetail = {nextTypeFk:nextTypeFk, type:''};
    }
    
    if(statusDetail.nextTypeFk != null)
    {
      nextTypeFk = statusDetail.nextTypeFk;

      await models.status.create({
          statusTypeFk: nextTypeFk,
          createdDttm : Date.now(),
          schoolFk: schoolId,
          deleteFl: false,
          versionNo: 1
        });
    }    
        
    res.json({statusDetail:statusDetail});
}

exports.getGiveBackAmount = async function(schoolId)
{
   return await getGiveBackAmount(schoolId);
}

async function getGiveBackAmount(schoolId)
{
    // orders linked to a class
    var query = 'select distinct b.id, pv.name, b.quantity as quantity  from classes c ' +
    ' inner join kids k on k.classFk = c.id ' + 
    ' inner join schools s on c.schoolFk = s.id ' +
    ' inner join productItems pi on pi.kidFk = k.id ' + 
    ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
    ' inner join basketItems b on b.productItemFk = pi.id ' +
    ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' + 
    ' where pb.status = :completed ';
    
    if(schoolId)
        query = query + ' and s.id = :schoolId ';
    
    var result = await models.sequelize.query(query,
    {replacements:{schoolId:schoolId, completed:'Completed'}, type: models.sequelize.QueryTypes.SELECT});

    query = 'select distinct b.id, pv.name, b.quantity as quantity from schools s ' +
        ' inner join classes c on c.schoolFk = s.id ' +
        ' inner join kids k on k.classFk = c.id ' +
        ' inner join basketItems b on b.accountFk = k.parentAccountFk ' +
        ' inner join productItems pi on b.productItemFk = pi.id ' +
        ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
        ' inner join products p on pv.productFk = p.id ' +
        ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
        ' inner join kids k2 on pi.kidFk = k2.id ' +
        ' where k2.classFk is null ' +
        ' and pb.status = :completed ';

    if(schoolId)
        query = query + ' and s.id = :schoolId ';

    var result2 = await models.sequelize.query(query,
        {replacements:{schoolId:schoolId, completed:'Completed'}, type: models.sequelize.QueryTypes.SELECT});

    result2.forEach(item => {
        result.push(item);
    })

    var giveBackTotal = 0;
    var photoPackQuantity = 0;
    var photoPackGiveBack = 0;
    var standardPackQuantity = 0;
    var standardPackGiveBack = 0;
    result.forEach(item =>{

        if(item.name == 'Photo Pack')
        {
            photoPackQuantity = photoPackQuantity + parseFloat(item.quantity);
            photoPackGiveBack = photoPackGiveBack + (parseFloat(item.quantity) * 0.8);
        }
        else if(item.name == 'Standard')
        {
            standardPackQuantity = standardPackQuantity + parseFloat(item.quantity);
            standardPackGiveBack = standardPackGiveBack + (parseFloat(item.quantity) * 0.7);
        }
    });

    giveBackTotal = photoPackGiveBack + standardPackGiveBack;

    var array = {giveBackTotal: giveBackTotal.toFixed(2), photoPackGiveBack: photoPackGiveBack.toFixed(2),
                photoPackQuantity: photoPackQuantity.toFixed(0), standardPackGiveBack:standardPackGiveBack.toFixed(2),
                standardPackQuantity:standardPackQuantity.toFixed(0)};

    query = 'select distinct b.id, b.quantity as quantity from schools s ' +
    ' inner join classes c on c.schoolFk = s.id ' +
    ' inner join kids k on k.classFk = c.id ' +
    ' inner join basketItems b on b.accountFk = k.parentAccountFk ' +
    ' inner join productItems pi on b.productItemFk = pi.id ' +
    ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
    ' inner join products p on pv.productFk = p.id ' +
    ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
    ' where (p.name = :originalCalendar1 or p.name = :originalCalendar2 ) ';
    
    if(schoolId)
        query = query + ' and s.id = :schoolId ';

    query = query + ' and pb.status = :completed ';
    result = await models.sequelize.query(query, 
    {replacements: {originalCalendar1:'Original Portrait Calendar',schoolId:schoolId,
     originalCalendar2:'Original Landscape Calendar', completed:'Completed'},
    type: models.sequelize.QueryTypes.SELECT});
   
    if(result.length == 0 || result[0].quantity == null )
        return array;
    
    var calendarQuantity = 0
    result.forEach(item =>{
        calendarQuantity = calendarQuantity + parseFloat(item.quantity);
    });
    var calendarAmount = (parseFloat(calendarQuantity)* 0.4);
    giveBackTotal = giveBackTotal + calendarAmount;

    array['giveBackTotal'] = giveBackTotal.toFixed(2);
    array['calendar'] = calendarAmount.toFixed(2);
    array['calendarQuantity'] = calendarQuantity.toFixed(0);

    return array;
}

exports.getNumberOfSchools = async function()
{
    return await getNumberOfSchools();
}

async function getNumberOfSchools()
{
    var schools = await models.school.findAll({
        where:{
            deleteFl: false
        }
    });

    return schools.length;
}

exports.getSchoolDashboardStatus = async function()
{
    var result = await models.sequelize.query('select s.* from schools s ' +
        ' inner join statuses st on st.schoolFk = s.id ' +
        ' where st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc limit 1) ' +
        ' and st.statusTypeFk = 13 ',
        {type: models.sequelize.QueryTypes.SELECT});
    
    var numberOfCompleted = result.length;

    var numberOfSchools = await getNumberOfSchools();
    var numberOfCompletedPercentage = (numberOfCompleted/ numberOfSchools) * 100;
    var numberOfNonCompleted = numberOfSchools - numberOfCompleted;
    var numberOfNonCompletedPercentage = 100 - numberOfCompletedPercentage;

    return {numberOfCompleted:numberOfCompleted, numberOfNonCompleted:numberOfNonCompleted,
        numberOfCompletedPercentage:numberOfCompletedPercentage.toFixed(0),numberOfNonCompletedPercentage:numberOfNonCompletedPercentage.toFixed(0)};
}

exports.getSchoolProgressDetails = async function()
{
    var result = await models.sequelize.query('select s.name, s.schoolNumber, (st.statusTypeFk/13)*100 as percentage from schools s ' +
            ' inner join statuses st on st.schoolFk = s.id ' +
            ' where st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc limit 1) ' +
            ' order by percentage desc',
            {type:models.sequelize.QueryTypes.SELECT});

    return result;
}

exports.getGiveBackAmountDetailForClassId = async function(classId, processedBasketItems)
{

}

exports.getGiveBackAmountDetailsForEachSchool = async function()
{
    return await getGiveBackAmountDetailsForEachSchool();
}

async function getGiveBackAmountDetailsForEachSchool()
{
    var schools = await models.school.findAll();
    var result = new Array();
    for(var i = 0; i < schools.length; i++)
    {
        var school = schools[i];

        var giveBackAmounts = await getGiveBackAmount(school.id);
        giveBackAmounts['school'] = school.name;
        giveBackAmounts['schoolNumber'] = school.schoolNumber;
        var requiresAction = await getSchoolsRequiringGiveBackAction(school.id);
        giveBackAmounts['action'] = requiresAction.length > 0;
        result.push(giveBackAmounts);
    }

    return result;
}

exports.getGiveBacksScreen = async function(req,res)
{
    var backgroundSetting = await adminController.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await adminController.getOrdersNotShipped();

    var giveBackAmountDetailsForEachSchool = await getGiveBackAmountDetailsForEachSchool();
    var schoolsRequiringGiveBackAction = await getSchoolsRequiringGiveBackAction();

    res.render('giveBackAmounts',{user:req.user, giveBackAmountDetailsForEachSchool:giveBackAmountDetailsForEachSchool,
         backgroundSetting:backgroundSetting, ordersNotShipped:ordersNotShipped, schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction});
}

exports.getDeadlinesScreen = async function(req,res)
{
    var backgroundSetting = await adminController.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await adminController.getOrdersNotShipped();
    var deadlines = await models.sequelize.query('select CAST(d.deadLineDttm AS DATE) as deadLine, s.name, s.schoolNumber, d.delayFl from deadlines d ' + 
        ' inner join schools s on d.schoolFk = s.id ',
        {type:models.sequelize.QueryTypes.SELECT});

    var schoolsRequiringGiveBackAction = await schoolController.getSchoolsRequiringGiveBackAction();

    res.render('deadlines',{user:req.user,schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction,
         backgroundSetting:backgroundSetting, deadlines:deadlines, ordersNotShipped:ordersNotShipped});
}

exports.continue = async function(req,res)
{
  // move to worker
    var errors = new Array();
    var account = req.user;
    var basketItemsDetails = null;
    if(account != null)
    {
        basketItemsDetails = await basketController.getBasketItemsDetailsForAccountId(account.id);
    }
    var verificationCode = req.query.verificationCode;
    
    var deadline = await models.deadLine.findOne({
        where:{
          verificationCode:verificationCode
        }
    });

    if(deadline == null)
    {
        errors.push('Invalid Request')
        //break
        return res.render('continue2', {user:req.user, errors:errors,basketItemsDetails:basketItemsDetails});
    }
    var school = await schoolController.getSchoolFromSchoolId(deadline.schoolFk);
    

    var date = new Date(deadline.deadLineDttm);
        
    // var threeDay = new Date();
    // threeDay.setDate(date.getDate() + 3);
        
    if(deadline.continueFl == true)
    {
        // means we have already had a response
        errors.push('We have already received a response and the status for ' + school.name + ' is already at ' + (deadline.continueFl == true ? 'Printing' : 'Delayed'));
        //break
        return res.render('continue2', {user:req.user, school:school.name, errors:errors, basketItemsDetails:basketItemsDetails});

    }
    else if(date.getTime() > Date.now())
    {
        // deadline has not passed
        errors.push('Invalid Request');
        return res.render('continue2', {user:req.user, school:school.name, errors:errors, basketItemsDetails:basketItemsDetails});
        // break
    }
    else 
    {
        var printStatus = await models.status.findOne({
            where:{
                schoolFk:school.id,
                statusTypeFk:7
            }
        })

        if(printStatus == null)
        {
            // change to print status
            await statusController.changeToPrintStatus(school.id,true);
            res.render('continue2', {user:req.user, school:school.name, errors:errors, basketItemsDetails:basketItemsDetails});
        }
        else
        {
            errors.push('Printing has already started for ' + school.name) ;  
            res.render('continue2', {user:req.user, school:school.name, errors:errors, basketItemsDetails:basketItemsDetails});
        }
        
    }
}

exports.setDeadLine = async function(req,res)
{
  // case where new deadline

    const schoolId = req.body.schoolId;
    var deadLineDttm = req.body.deadLineDttm;
    
    var deadLine = await models.deadLine.findOne({
        where:
        {
        schoolFk: schoolId
        }
    });

    if(deadLine == null)
    {
        var verificationCode = await createVerificationCodeForDeadline();
        // means new entry
        await models.deadLine.create({
            schoolFk:schoolId,
            deadLineDttm:deadLineDttm,
            continueFl:false,
            delayFl:false,
            emailSentFl:false,
            verificationCode:verificationCode
        }).catch(error=>{
            console.log(error);
        });
    }
    else
    {
       if(deadLine.deadLineDttm != deadLineDttm)
       {
            await models.deadLine.update(
            {
                deadLineDttm:deadLineDttm,
                versionNo: models.sequelize.literal('versionNo + 1')
            },
            {
                where:{
                    schoolFk:schoolId
                }
            })
       }
    }

    res.json({success:"success"});
}


async function createVerificationCodeForDeadline()
{
    var errors = new Array();
    var code = dadController.makeCode();

    var deadline = await models.deadLine.findOne({
        where:{
            verificationCode: code
        }
    });

    if(deadline == null)
        return code;
    
    return await createVerificationCodeForDeadline();
}

exports.delay = async function(req,res)
{
    var errors = new Array();
    var account = req.user;
    var basketItemsDetails = null;
    if(account != null)
    {
        basketItemsDetails = await basketController.getBasketItemsDetailsForAccountId(account.id);
    }
    var verificationCode = req.query.verificationCode;
    var deadline = await models.deadLine.findOne({
        where:{
            verificationCode: verificationCode
        }
    });

    if(deadline == null)
    {
        errors.push('Invalid Request');
        return res.render('delay2',{user:req.user,errors:errors,basketItemsDetails:basketItemsDetails});
    }

    var school = await models.school.findOne({
      where:{
        id:deadline.schoolFk
      }
    });
    
    var result = await  models.sequelize.query('select * from statuses s ' + 
                    ' inner join schools sch on s.schoolFk = sch.id ' + 
                    ' inner join statusTypes st on s.statusTypeFk = st.id ' +
                    ' where sch.id = :schoolId ' + 
                    ' and ( st.type = :printing  or st.type = :delay) ', {replacements:{schoolId:school.id,
                    printing:'Printing',delay:'Delay'}, type:models.sequelize.QueryTypes.SELECT});
                    

    if(result.length > 0 )
    {
        // already been delayed or continued
        errors.push('Invalid Request');
    }
    else
    {
        var deadline = new Date(deadline.deadLineDttm);
        var window  = new Date();
        window.setDate( deadline.getDate() + 3 );
        
        if( deadline.getTime() > Date.now())
        {
            // we havent passed deadline
            errors.push('Invalid Request');
        }
        else if ( window.getTime() < Date.now())
        {
            // window passed
            errors.push('The 3 day window to delay has passed, so the printing process has started.')
        }
        else
        {
            // delay
            await models.status.create({
                statusTypeFk:6,
                schoolFk:school.id,
                createdDttm:Date.now(),
                versionNo:1,
                deleteFl: false
            });

            await models.deadLine.update(
                {
                    continueFl:false,
                    delayFl: true,

                },{
                    where:{
                            schoolFk:school.id
                            }
                    });
                           
        }
    }   

    res.render('delay2', {user:req.user,errors:errors, school:school.name, basketItemsDetails:basketItemsDetails});
}

exports.displayLinkSchoolButton = async function(req,res)
{
    var productItemId = req.query.productItemId;

    var productItem = await productController.getProductItemById(productItemId);

    if(productItem == null)
        return res.json({displayLinkSchoolButton:false});

    return res.json({displayLinkSchoolButton:(productItem.classFk == null)});
}

exports.linkKidByProductItemId = async function(req,res)
{
    var productItemId = req.body.productItemId;
    var classCode = req.body.classCode;
    var schoolCode = req.body.schoolCode;

    var productItem = await models.productItem.findOne({
        where:{
            id: productItemId
        }
    });

    if(productItem == null)
    {
        var errors = {
            code: "Please Contact Support as an unexpected error has occured."
        }
        // error
        return res.json({errors:errors});
    } 


    var classAndSchool = await classController.getClassAndSchoolByNumber(classCode, schoolCode);

    if(classAndSchool == null)
    {
        var errors = {
            code: "The class code or school code you entered is not valid, please make sure you have entered the codes correctly"
        }
        // error
        return res.json({errors:errors});
    } 

    var product = await productController.getProductFromProductItemId(productItemId);

    if(product == null)
    {
        var errors = {
            code: "Please Contact Support as an unexpected error has occured."
        }
        // error
        return res.json({errors:errors});
    } 

    if(product.kidFl)
    {
        var kid = await models.sequelize.query('select k.* from productItems pi ' + 
        ' inner join kids k on pi.kidFk = k.id ' +
        ' where pi.id = :productItemId', {replacements:{productItemId:productItemId}, type:models.sequelize.QueryTypes.SELECT});
       
        kid = kid[0];

        var schoolClass = await models.class.findOne({
        where:{
            classNumber: classCode
        }
        });

        await models.kid.update({
        classFk: schoolClass.id
        },{
        where:{
            id: kid.id
        }
        });
    }
   
    await models.productItem.update({
        classFk: classAndSchool.classId
    },{
        where:{
            productItemGroupFk:productItem.productItemGroupFk
        }
    })

    return res.json({});
}

exports.confirmAmount = async function(req,res)
{   
    var account = req.user;
    var basketItems = await basketController.getBasketItemsDetailsForAccountId(account.id);

    var school = await models.school.findOne({
        where:{
            organiserAccountFk:account.id
        }
    });

    if(school == null)
        return res.redirect('/organiserDashboard');

    var charityAmount = await models.charityAmount.findOne({
        where:{
            schoolFk: school.id
        }
    });
    
    if(charityAmount == null)
        return res.redirect('/organiserDashboard');

    var giveBackAmountBreakDownPerClass = await getGiveBackAmountBreakDownPerClass(school.id);
    var classes = giveBackAmountBreakDownPerClass.classesData;
    var totalGiveBackAmount = giveBackAmountBreakDownPerClass.totalGiveBackAmount;

    res.render('confirmAmount2', {user:req.user, basketItemsDetails:basketItems, classes:classes, 
        totalGiveBackAmount:totalGiveBackAmount, charityAmount:charityAmount});
 
}

exports.getCharityAmount = async function(schoolId)
{
    return await getCharityAmount(schoolId);
}

async function getCharityAmount(schoolId)
{
    return await models.charityAmount.findOne({
        where:{
            schoolFk:schoolId
        }
    })
}

exports.getGiveBackAmountBreakDownPerClass = async function(schoolId)
{
    return await getGiveBackAmountBreakDownPerClass(schoolId);
}

async function getGiveBackAmountBreakDownPerClass(schoolId)
{
    var classes = await models.sequelize.query('select distinct c.* from basketitems b ' + 
                      ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
                      ' inner join productItems pi on b.productItemFk = pi.id ' +
                      ' inner join classes c on pi.classFk = c.id ' +
                      ' where pb.status = :completed ' + 
                      ' and c.schoolFk = :schoolId' ,{replacements:{completed:'Completed',schoolId:schoolId}, type:models.sequelize.QueryTypes.SELECT});

    var classesData = new Array();
    var totalGiveBackAmount = 0;
    for( var i = 0; i < classes.length; i++ )
    {
        var schoolClass = classes[i];
        var giveBackAmountDetailsForClass = await classController.getGiveBackAmountDetailsForClassByClassId(schoolClass.id);
        giveBackAmountDetailsForClass['name'] = schoolClass.name;

        totalGiveBackAmount = totalGiveBackAmount + parseFloat(giveBackAmountDetailsForClass.giveBackTotal);
        classesData.push(giveBackAmountDetailsForClass);
    }

    totalGiveBackAmount = totalGiveBackAmount.toFixed(2);

    return {classesData:classesData, totalGiveBackAmount:totalGiveBackAmount};
}

exports.getSubmitBankDetails = async function(req,res)
{
    var account = req.user;

    var school = await models.school.findOne({
        where:{
            organiserAccountFk:account.id
        }
    });

    if(school == null)
        return res.redirect('/organiserDashboard');

    var charityAmount = await models.charityAmount.findOne({
        where:{
            schoolFk: school.id
        }
    });

    if(charityAmount == null || charityAmount.confirmedFl == true)
        return res.redirect('/organiserDashboard');

    
    var giveBackAmountBreakDownPerClass = await getGiveBackAmountBreakDownPerClass(school.id);
    var totalGiveBackAmount = giveBackAmountBreakDownPerClass.totalGiveBackAmount;
    var basketItems = await basketController.getBasketItemsDetailsForAccountId(account.id);

    if(charityAmount.amount != totalGiveBackAmount)
    {
        await models.charityAmount.update({
            amount: totalGiveBackAmount,
            versionNo: models.sequelize.literal('versionNo + 1')
        },{
            where:{
                id:charityAmount.id
            }
        });

        charityAmount[amount] = totalGiveBackAmount;
    }
    
    res.render('submitBankDetails', {user:req.user,basketItemsDetails:basketItems, charityAmount:charityAmount})

}

exports.submitConfirmAmount = async function(req,res)
{
    var errors = {};
    errors = confirmAmountValidator.validateConfirmAmountDetails(errors,req);
  
    if(errors.sortCode || errors.bankAcc)
    {
        console.log('err');
        return res.json({ errors:errors});
    }
    else
    {
        var account = req.user;

        var school = await models.school.findOne({
            where:{
                organiserAccountFk:account.id
            }
        });
        
        await models.charityAmount.update({
            confirmedFl:true,
            confirmedDttm: Date.now(),
            versionNo: models.sequelize.literal('versionNo + 1')
        },{
            where:{
                schoolFk:school.id
            }
        });

        await models.status.create({
            statusTypeFk:11,
            schoolFk:school.id,
            createdDttm:Date.now(),
            versionNo: models.sequelize.literal('versionNo + 1')
          });
        
        await queueController.addSendConfirmationDetailEmailJob(school.id,req.body.name,req.body.bankAcc,
            req.body.sortCode,req.body.type);

        return res.json({success:'success'});                                
    }
}

exports.getSchoolsRequiringGiveBackAction = async function(schoolId)
{
    return await getSchoolsRequiringGiveBackAction(schoolId);
}

async function getSchoolsRequiringGiveBackAction(schoolId)
{

    // for each school find school where charityamount has been confirmed and 
    // still on step 11 Confirmed Charitable Contribution

    var currentSchoolsStatusDetails = await getCurrentSchoolsStatusDetails(schoolId);

    if(currentSchoolsStatusDetails.length == 0)
        return currentSchoolsStatusDetails;

    var schoolIds = new Array();

    currentSchoolsStatusDetails.forEach(item => {
        if(item.statusTypeId == 11)
            schoolIds.push(item.schoolId);
    });

    if(schoolIds.length == 0)
        return [];

    return await models.sequelize.query('select s.name, c.* from charityAmounts c' +
                            ' inner join schools s on c.schoolFk = s.id ' +
                            ' where c.confirmedFl = true ' + 
                            ' and schoolFk in (:schoolIds) ',{replacements:{schoolIds:schoolIds}, type: models.sequelize.QueryTypes.SELECT});   

}

async function getCurrentSchoolsStatusDetails(schoolId)
{
    var query = 'select s.id as schoolId, s.schoolNumber,s.name, st.id as statusId, stt.id as statusTypeId, stt.type as currentStep from schools s ' +
    ' inner join statuses st on st.schoolFk = s.id ' +
    ' inner join statusTypes stt on st.statusTypeFk = stt.id ' +
    ' where st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc limit 1 ) ';

    if(schoolId != null && schoolId != undefined)
        query = query + ' and s.id = :schoolId';

    return await models.sequelize.query(query,{replacements:{schoolId:schoolId}, type:models.sequelize.QueryTypes.SELECT}); 
}

exports.getGiveBackDetailsScreen = async function(req,res)
{
    var schoolNumber = req.query.schoolNumber;
    var school = await models.school.findOne({
        where:{
            schoolNumber:schoolNumber
        }
    });

    if(school == null)
        return res.redirect('/give_back');
    
    var giveBackAmountBreakDownPerClass = await getGiveBackAmountBreakDownPerClass(school.id);
    var classes = giveBackAmountBreakDownPerClass.classesData;
    var totalGiveBackAmount = giveBackAmountBreakDownPerClass.totalGiveBackAmount;
    var backgroundSetting = await adminController.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await adminController.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await getSchoolsRequiringGiveBackAction();
    var charityAmount = await models.charityAmount.findOne({
        where:{
            schoolFk: school.id
        }
    });

    var schoolRequiresAction = schoolsRequiringGiveBackAction.filter( o => o.schoolFk == school.id);
    res.render('giveBackDetails',{user:req.user, school:school, classes:classes, totalGiveBackAmount:totalGiveBackAmount,
                backgroundSetting:backgroundSetting, ordersNotShipped: ordersNotShipped, schoolRequiresAction:schoolRequiresAction.length > 0,
                schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction, charityAmount:charityAmount})
}

exports.getKidsLinkedToSchools = async function()
{
    return await models.sequelize.query('select distinct s.name, s.schoolNumber, count(k.id) as totalKids from kids k ' +
                ' inner join classes c on k.classFk = c.id ' +
                ' inner join schools s on c.schoolFk = s.id ' +
                ' group by s.name having totalKids > 0 ', {type: models.sequelize.QueryTypes.SELECT});
}