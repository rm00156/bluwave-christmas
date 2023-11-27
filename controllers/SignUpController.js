const models = require('../models');
let bcrypt = require('bcrypt');
let passport = require('passport');
// const process.env = require('../process.env/process.env.json');
const{validateUser,validateOrganiserSignup} = require('../validators/signup');
const {isEmpty} = require('lodash');
var queueController = require('../controllers/QueueController');

var dashboardController = require('../controllers/DashboardController');
var dadController = require('../controllers/DadController');
var adminController = require('../controllers/AdminController');
var schoolController = require('../controllers/SchoolController');

const fetch = require('node-fetch');
const { stringify } = require('querystring');
const secretKey = '6LdzUtsZAAAAANN5bdygrPETR8paX5WGFT38ATfB';

const accountUtility = require('../utility/account/accountUtility');

exports.captcha = async function(req,res)
{
    var captcha = req.body.captcha;
    if(!captcha)
    {
      return res.json({error:'Token not defined'});
    }

    const query = stringify({
        secret: secretKey,
        response: req.body.captcha,
        remoteip: req.connection.remoteAddress
      });
    const verifyURL = `https://google.com/recaptcha/api/siteverify?${query}`;

    const body = await fetch(verifyURL).then(res => res.json());

 
    if(!(body.success) || body.score < 0.4)
    {
        return res.json({error:'You might be a robot, sorry!! You are banned!',score:body.score});
    }

    return res.json({});

}

exports.signup = async (req, res, next)=>{
    let errors = {};
    return validateUser(errors, req).then(async errors=>{
 
        if(!isEmpty(errors)) {
            // reRender the sign up page with the errors
            console.log(errors);
            var type = req.body.type;
            rerender_signup(errors,req,res, next, type);
        }
        else
        {
            var accountTypeFk = 2;
            
            var type = req.body.type;
            var name = req.body.name;
            var telephoneNo = req.body.telephoneNo;
            
            var transaction = await models.sequelize.transaction();
            var accountNumber = await adminController.getNewAccountCode();

            const accountDetail = {
                accountNumber: accountNumber,
                email: req.body.email,
                hashPassword: generateHash(req.body.password),
                name: name,
                accountTypeId: accountTypeFk,
                telephoneNumber: telephoneNo,
                defaultPassword: false
            }
            try {
                await accountUtility.createAccount(accountDetail);
            } catch(err) {
                // throw exception
                console.log(err);
                
                await transaction.rollback();
                throw 'error with account sign up';
            }
            
            await transaction.commit();

            await queueController.addParentRegistrationEmailJob(req.body.email);
            await queueController.addParentRegistrationBluwaveEmailJob(req.body.email,telephoneNo,name);
                       
            // authenticate with passport
            passport.authenticate('local', {
                successRedirect:'/parentDashboard',
                failureRedirect:'/signup',
                failureFlash: true
            })(req, res, next);
            // needs to be translated to the create your own card button
        }
       });
 }
 

 exports.signupOrganiser = function(req,res,next)
 {
    let errors = {};
    return validateOrganiserSignup(errors, req).then( async errors=>{
 
    if(!isEmpty(errors)){
        // reRender the sign up page with the errors
        console.log(errors);
        rerender_signup(errors,req,res, next);
    }
    else{

        const t = await models.sequelize.transaction()
        var accountNumber = await adminController.getNewAccountCode();
        try {

            const accountDetail = {
                accountNumber: accountNumber,
                email: req.body.email,
                hashPassword: generateHash(req.body.password),
                name: req.body.name,
                accountTypeId: 3,
                telephoneNumber: req.body.telephoneNo,
                defaultPassword: false
            }
            const newAccount = await accountUtility.createAccount(accountDetail);

            var schoolNumber = await generateSchoolNumber(req.body.school);

            var school = await models.school.create({
                name:req.body.school,
                schoolNumber:schoolNumber,
                address:req.body.address,
                postCode: req.body.postCode,
                number: req.body.telephoneNo,
                email: req.body.email,
                additionalInfo: req.body.additionalInfo,
                numberOfKidsPerClass: req.body.numberOfKidsPerClass,
                organiserAccountFk: newAccount.id,
                deleteFl: false,
                versionNo: 1
            });

            var classArray = req.body['classArray[]'];

            for(var i = 0; i < classArray.length; i++) 
            {
                var index = classArray[i];
                var classValue = req.body['class' + index];
                await schoolController.createClass( classValue, school.id,t);
            }

            await models.status.create({
                statusTypeFk: 1,
                createdDttm: Date.now(),
                schoolFk:school.id,
                deleteFl: false,
                versionNo: 1
            },{ transaction: t});

        }
        catch(error)
        {
            console.log(error)
            await t.rollback();
            throw error;
        }

        await t.commit();
        
        passport.authenticate('local', {
                        successRedirect:'/organiserDashboard',
                        failureRedirect:'/signup_organiser',
                        failureFlash: true
                    })(req, res, next);

        var classes = await models.class.findAll({
            where:{
                schoolFk:school.id
            }
        });
        await queueController.addOrganiserRegistrationEmailJob(req.body.email,school,req.body.name);
        await queueController.addOrganiserRegistrationBluwaveEmailJob(school,newAccount.dataValues,req.body.name,classes.length);
    }

})
 }

 const generateHash = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null );
}

exports.generateHash = function(password)
{
    return generateHash(password);
}
 
const rerender_signup = async function(errors,req, res, next,type)
{
    if(req.path == '/signupOrganiser')
    {
        console.log(errors)
        res.render('signupOrganiser3', {formData:req.body, errors:errors});
    }
    else if(req.path == '/signup')
    {
        res.render('signup3', {formData:req.body, errors:errors, type:type});
    }
    else
    {
        res.render('signUpAdmin',{formData:req.body, errors:errors,user:req.user});
    }    
}


const render_login = function( req,res,next)
{
    res.render('home4', {formData:req.body,error:'You have entered an invalid username or password'});
}

exports.login = function( req,res,next)
{
    
    passport.authenticate('local', (err,user,info)=> {
        if(err)
            return next(err);
        
        if(!user)
            return render_login(req,res);

        req.logIn(user,async (err)=>{

                if(err)
                {
                    console.log(err)
                    return next(err);
                }
                    

                if(user.firstLoginFl == true)
                {
                    await models.account.update({
                        firstLoginFl:false
                    },{
                        where:{
                            id:user.id
                        }
                    });
                }

                var dashboardPath;            
                if(user.accountTypeFk == 1)
                {
                    dashboardPath = '/adminDashboard'; 
                } 
                else if(user.accountTypeFk == 2 )
                {
                    dashboardPath = '/parentDashboard';
                }   
                else
                {
                    if(req.body.confirm == 'true')
                    {
                        dashboardPath = '/confirmAmount'
                    }
                    else
                    {
                        dashboardPath = '/organiserDashboard';
                    }
                }        
                
                return res.redirect(dashboardPath);

                
            });
    })(req,res,next);
       
}

exports.logout = function(req, res, next)
{
    req.logout();
    req.session.destroy();
    res.redirect('/');
}

exports.signupPage = async function(req,res)
{
    // res.redirect('/');
    var type = req.query.type;
    res.render('signup3',{type:type,errors:{}});
  
}

exports.signupOrganiserPage = function(req,res)
{
    // res.render('signupOrganiser3',{errors:{}});
    res.redirect('/login');
}

exports.signUpAdmin = function(req,res)
{
    res.render('signUpAdmin', {errors:{},user:req.user} );
}

exports.signUpAdminPage = function(req,res,next)
{
    let errors = {};
 
    return validateUser(errors, req).then(errors=>{
 
     if(!isEmpty(errors))
     {
         // reRender the sign up page with the errors
         console.log(errors);
         rerender_signup(errors,req,res, next);
     }
     else
     {
       
       if(req.body.name == undefined)
       {
        return models.account.build({
                email: req.body.email,
                password: generateHash(req.body.password),
                accountTypeFk: 1,
                defaultPassword:false,
                firstLoginFl:true,
                versionNo: 1,
                deleteFl: false
            }).save().then(()=>{

              return  dashboardController.loadScreen(req,res);
            });
       }
    
    }

    });
}


const createDummyKid = async function(req, res, next,accountId)
{
    var code = dadController.makeCode();
    var name = "John Doe";
    var age = 5;
    var month = 0;
    var displayClass = false;
    var displayAge = true;
    var displaySchool = false;
    var s3ArtworkPath = 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Artwork/Default/goesHere.png?versionId=on3S9HuQzOw9ODk7DAJZXu289axUWjeL';

    await models.class.findOne({
      where:{
        name:'Individual Class'
      }
    }).then(schoolClass=>{

      var classId = schoolClass.id;
      models.kid.findOne({
        where:{
          code:code
        }
      }).then(kid=>{

        if(kid == null)
        {
          models.kid.build({
            name:name,
            age:age,
            month:month,
            classFk:classId,
            artwork:s3ArtworkPath,
            displayClass:displayClass,
            displayAge:displayAge,
            displaySchool:displaySchool,
            code:code,
            parentAccountFk:accountId,
            deleteFl:false
          }).save().then(kid=>{
            var s3Bucket = process.env.s3BucketPath + 'Calendar/';
            models.calendar.build({
              kidFk:kid.id,
              landscapeRedPath: s3Bucket + 'defaultLandscapeRed.pdf',
              landscapeGreenPath:s3Bucket + 'defaultLandscapeGreen.pdf',
              landscapeBluePath:s3Bucket + 'defaultLandscapeBlue.pdf',
              landscapeRedPathPreview: s3Bucket + 'defaultLandscapeRedPreview.pdf',
              landscapeGreenPathPreview:s3Bucket + 'defaultLandscapeGreenPreview.pdf',
              landscapeBluePathPreview:s3Bucket + 'defaultLandscapeBluePreview.pdf',
              portraitRedPath: s3Bucket + 'defaultPortraitRed.pdf',
              portraitGreenPath:s3Bucket + 'defaultPortraitGreen.pdf',
              portraitBluePath:s3Bucket + 'defaultPortraitBlue.pdf',
              portraitRedPathPreview: s3Bucket + 'defaultPortraitRedPreview.pdf',
              portraitGreenPathPreview:s3Bucket + 'defaultPortraitGreenPreview.pdf',
              portraitBluePathPreview:s3Bucket + 'defaultPortraitBluePreview.pdf',
            }).save().then(()=>{
    
               models.card.build({
                path:'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Individual/2019/Individual+Class/1571186341277_John+Doe_FZfziVc.pdf',
                // previewPath:'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Individual/2019/Individual+Class/Previews/1571185889779_John+Doe_kgxJxn3.pdf',
                fileName:'Dummy+School/2019/Dummy+Individual/1570297526783_John+Doe_vP60Qg3.pdf',
                // previewFileName:'Dummy+School/2019/Dummy+Individual/Previews/1570296984962_John+Doe_OJYe1SJ.pdf',
                package2Path:'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Individual/2019/Individual+Class/1571186341277_John+Doe_FZfziVc.pdf',
                // package2PreviewPath:'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Individual/2019/Individual+Class/Previews/1571185889779_John+Doe_kgxJxn3.pdf',
                package2FileName:'Dummy+School/2019/Dummy+Individual/Pacakge+2/1570296984962_John+Doe_OJYe1SJ.pdf',
                // package2PreviewFileName:'Dummy+School/2019/Dummy+Individual/Pacakge+2/Previews/1570296984962_John+Doe_OJYe1SJ.pdf',
                kidFk:kid.id

              }).save().then(()=>{
                passport.authenticate('local', {
                    successRedirect:'/parentDashboard',
                    failureRedirect:'/signup',
                    failureFlash: true
                })(req, res, next);
              });
            })
          });
    
        }
        else
        {
          code = dadController.makeCode();
          createDummyKid(req,res,next,accountId);
        }

      })
    })
}


function generateSchoolNumber(school)
{
    var schoolCode = school.substring(0,3);
    var code = dadController.makeCode();
    var schoolNumber = schoolCode + code;

    return models.school.findOne({
        where:{
            schoolNumber: schoolNumber
        }
    }).then(school => {

        if(school == null)
            return schoolNumber;

        return generateSchoolNumber(school);
    })
}
