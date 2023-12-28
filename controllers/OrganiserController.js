const models = require('../models');
const schoolController = require('../controllers/SchoolController');
const kidController = require('../controllers/KidController');
const classController = require('../controllers/ClassController');
const schoolUtility = require('../utility/school/schoolUtility');
const basketUtility = require('../utility/basket/basketUtility');

const validator = require('../validators/signup');


exports.classesScreen = async function( req,res )
{
    var accountId = req.user.id;
    var school = await schoolUtility.getSchoolFromAccountId(accountId);
    var orderDetails = await schoolUtility.getOrderDetailsForAllKidsFromSchoolId(school.id);
    var isKidLinkedToAccount = await kidController.isKidLinkedToAccountId(accountId);
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(accountId);
    var classes = await schoolUtility.getClassesForSchoolId(school.id);
    var statusTypeDetails = await schoolUtility.getStatusTypeDetailsForSchoolId(school.id);
    
    res.render('schoolParticipants3',{user:req.user,orderDetails: orderDetails, displayParentSection:isKidLinkedToAccount,
        basketItemsDetails:basketItemsDetails, classes:classes, school:school, statusTypeDetails:statusTypeDetails});
}


exports.classOrders = function(req,res)
{
    const classId = req.query.classId;

    models.class.findOne({
        where:{
            id:classId
        }
    }).then(schoolClass=>{

        models.sequelize.query('select k.* from kids k ' + 
                                ' inner join classes c on k.classFk = c.id ' +  
                                ' where c.id = :classId ',
                                {replacements:{classId:classId},type:models.sequelize.QueryTypes.SELECT}).then(kids=>{

                                    var kidTotal = kids.length;

                                    models.sequelize.query('select distinct k.*, kh.* from kids k ' + 
                                    ' inner join classes c on k.classFk = c.id ' + 
                                    ' inner join schools s on c.schoolFk = s.id ' + 
                                    ' inner join basketItems b on b.kidFk = k.id ' + 
                                    ' inner join kidorderhistories kh on kh.kidFk = k.id ' + 
                                    ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
                                    ' where c.id = :classId '+ 
                                    ' and kh.accountFk = b.accountFk '+
                                    ' and pb.status = :completed ',
                                    {replacements:{classId:classId, completed:'Completed'},type:models.sequelize.QueryTypes.SELECT}).then(orderedKids=>{

                                        var orderedKidTotal = orderedKids.length;
                                        var orderedPercentage = ( orderedKidTotal / kidTotal ) * 100;
                                        orderedPercentage = Math.round( orderedPercentage * 10 ) / 10;
                                        orderedPercentage = isNaN(orderedPercentage) ?  0 : orderedPercentage;

                                        models.kid.findOne({
                                            where:{
                                                parentAccountFk:req.user.id
                                            }
                                        }).then(kid=>{
                                
                                            models.deadLine.findOne({
                                                where:{
                                                  schoolFk:schoolClass.schoolFk
                                                }
                                              }).then(deadLine=>{
                                          
                                                var deadLineDttm = '';
                                                var daysLeft = undefined;
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
                                                      
                                                        var daysLeftSign;
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
                                                var displayParentSection = kid == null ? false : true; 
                                            res.render('classOrders2', {user:req.user,schoolClass:schoolClass,
                                            kidTotal:kidTotal, orderedKidTotal:orderedKidTotal,orderedPercentage:orderedPercentage,
                                                    orderedKids:orderedKids,displayParentSection:displayParentSection,
                                                deadLineDttm:deadLineDttm,daysLeft:daysLeft,daysLeftSign:daysLeftSign});
                                       
                                            })
                                             })
                                    
                                        
                                     
                                    })
                                })
    })
}


exports.classParticipants = function(req,res)
{
    const classId = req.query.classId;
    console.log('romeo');
    models.class.findOne({
        where:{
            id:classId
        }
    }).then(schoolClass=>{

        models.sequelize.query('select k.* from kids k ' + 
                                ' inner join classes c on k.classFk = c.id ' +  
                                ' where c.id = :classId ',
                                {replacements:{classId:classId},type:models.sequelize.QueryTypes.SELECT}).then(kids=>{

                                    var kidTotal = kids.length;

                                    models.sequelize.query('select distinct k.*, kh.* from kids k ' + 
                                    ' inner join classes c on k.classFk = c.id ' + 
                                    ' inner join schools s on c.schoolFk = s.id ' + 
                                    ' inner join basketItems b on b.kidFk = k.id ' + 
                                    ' inner join kidorderhistories kh on kh.kidFk = k.id ' + 
                                    ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
                                    ' where c.id = :classId '+ 
                                    ' and kh.accountFk = b.accountFk '+
                                    ' and pb.status = :completed',
                                    {replacements:{classId:classId, completed:'Completed'},type:models.sequelize.QueryTypes.SELECT}).then(orderedKids=>{

                                        var orderedKidTotal = orderedKids.length;
                                        var orderedPercentage = ( orderedKidTotal / kidTotal ) * 100;
                                        orderedPercentage = Math.round( orderedPercentage * 10 ) / 10;
                                        orderedPercentage = isNaN(orderedPercentage) ?  0 : orderedPercentage;

                                        models.kid.findOne({
                                            where:{
                                                parentAccountFk:req.user.id
                                            }
                                        }).then(kid=>{
                                
                                            models.deadLine.findOne({
                                                where:{
                                                  schoolFk:schoolClass.schoolFk
                                                }
                                              }).then(async deadLine=>{
                                          
                                                var deadLineDttm = '';
                                                var daysLeft = undefined;
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
                                                      
                                                        var daysLeftSign;
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
                                                var displayParentSection = kid == null ? false : true; 
                                                var currentStatus = await models.sequelize.query('select sts.type from classes c ' +
                                        ' inner join schools s on c.schoolFk = s.id ' + 
                                        ' inner join statuses st on st.schoolFk = s.id ' +
                                        ' inner join statusTypes sts on st.statusTypeFk = sts.id ' +
                                        ' inner join statusTypes sts2 on sts.nextTypeFk = sts2.id ' +
                                        ' where c.id = :classId ' + 
                                        ' order by st.createdDttm desc LIMIT 1' , {replacements:{
                                          classId: classId,
                                        }, type: models.sequelize.QueryTypes.SELECT 
                                        });
                                            res.render('classParticipants2', {user:req.user,schoolClass:schoolClass,
                                            kidList:kids,kidTotal:kids.length, orderedKidTotal:orderedKidTotal,orderedPercentage:orderedPercentage,
                                                    orderedKids:orderedKids,displayParentSection:displayParentSection,
                                                deadLineDttm:deadLineDttm,daysLeft:daysLeft,daysLeftSign:daysLeftSign,currentStatus:currentStatus[0].type});
                                       
                                            })
                                             })
                                    
                                        
                                     
                                    })
                                })
    })
}


exports.loadOrganiserDashboard = async function(req,res)
{
    const account = req.user;
    var school = await models.sequelize.query('select s.*, a.email, a.accountNumber, sts.type, sts.id as typeId, sts.nextTypeFk  from schools s ' + 
        ' inner join statuses st on st.schoolFk = s.id ' +
        ' inner join statusTypes sts on st.statusTypeFk = sts.id ' +
        ' inner join accounts a on s.organiserAccountFk = a.id ' +
        ' where a.id = :id ' + 
        ' order by st.createdDttm desc, st.statusTypeFk desc LIMIT 1' , {replacements:{
        id: account.id,
    }, type: models.sequelize.QueryTypes.SELECT 
    }); 
    school = school[0];

    var orderDetails = await schoolUtility.getOrderDetailsForAllKidsFromSchoolId(school.id);
    var isKidLinkedToAccount = await kidController.isKidLinkedToAccountId(account.id);
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    var deadlineDetails = await schoolUtility.getDeadlineDetailsForSchoolId(school.id);
    var statusTypeDetails = await schoolUtility.getStatusTypeDetailsForSchoolId(school.id);
    var classes = await schoolUtility.getClassesForSchoolId(school.id);
    var giveBackAmount = await schoolUtility.getGiveBackAmount(school.id);
    var charityAmount = await schoolUtility.getCharityAmount(school.id);
    
    res.render('organiserDashboard3', {user:req.user, orderDetails: orderDetails, displayParentSection:isKidLinkedToAccount,basketItemsDetails:basketItemsDetails,
        deadlineDetails:deadlineDetails,school:school, giveBackAmount:giveBackAmount,
        charityAmount:charityAmount, statusTypeDetails:statusTypeDetails, isKidLinkedToAccount: isKidLinkedToAccount, numberOfClasses:classes.length}); 
}

exports.getSchoolDetailsPage = async function(req,res)
{
    var schoolNumber = req.query.schoolNumber;
    var user = req.user;
    var school = await schoolUtility.getSchoolFromSchoolNumber(schoolNumber)
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(user.id);

    res.render('schoolDetails',{user:req.user, school:school, user:req.user, basketItemsDetails:basketItemsDetails })
}

exports.editSchoolDetails = async function(req,res)
{
    var errors = {};
    var schoolId = req.body.schoolId;

    // validate values
    validator.validateOrganiserUserFields(errors,req);

    if(errors.telephoneNo || errors.postCode || errors.address || errors.name || errors.numberOfKidsPerClass)
    {
        // error
        res.json({errors:errors});
    }
    else
    {
        await schoolController.updateSchoolDetailsForSchoolId(schoolId, req.body.school, req.body.address, req.body.postCode, req.body.telephoneNo, req.body.name, req.body.additionalInfo, req.body.numberOfKidsPerClass );
        res.json({success:'success'});
    }
}

exports.getClassScreen = async function(req,res) {
  const classNumber = req.query.number;

  const account = req.user;
  var schoolClass = await schoolUtility.getClassByNumber(classNumber);
  if(schoolClass == null)
    return res.redirect('/organiserDashboard');
  
  var school = await schoolUtility.getSchoolFromAccountId(account.id);
  var classId = schoolClass.id;
  
  var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
  var isKidLinkedToAccount = await kidController.isKidLinkedToAccountId(account.id);

  var kids = await kidController.getKidsByClassId(classId);
  var orderDetails = await classController.getOrderDetailsForAllKidsFromClassId(classId, kids.length);
  var deadlineDetails = await schoolUtility.getDeadlineDetailsForSchoolId(school.id);
  var deadLineDttm = deadlineDetails.deadLineDttm;

  res.render('organiserClass',{user:account,orderDetails: orderDetails, deadLineDttm:deadLineDttm, displayParentSection:isKidLinkedToAccount,
        basketItemsDetails:basketItemsDetails, kids:kids, school:school, schoolClass:schoolClass});
  
}