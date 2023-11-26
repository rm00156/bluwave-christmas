const { identity } = require('lodash');
const { resolve } = require('path');
let validator = require('validator');
let models = require('../models');

const validateCreateUserFields= function( errors, req )
{
    if(req.body.email != undefined && !validator.isEmail(req.body.email))
      {  errors["email"] = "Please use a valid email address";
        console.log("Please use a valid email address");
      }

      if(req.body.reEmail != undefined && req.body.email != req.body.reEmail)
      {  errors["email"] = "Email addresses don't match";
        console.log("Email addresses don't match");
      }

    if(req.body.password != undefined && !validator.isAscii(req.body.password))
     {
          errors["password"] = "Invalid characters in password";
          console.log( "Invalid characters in password");
    }
    if(req.body.password != undefined && !validator.isLength(req.body.password,{min:5, max:25}))
    {       
         errors["password"] = "Please ensure that the password length is at least 5 characters long and no more than 25";
        console.log("Please ensure that the password length is at least 5 characters long and no more than 25");
    }

    if(req.body.rePassword != undefined && req.body.rePassword != req.body.password)
     {
          errors["password"] = "Passwords don't match";
          console.log( "Passwords don't match");
    }

    if(req.body.telephoneNo != undefined && !validator.isLength(req.body.telephoneNo,{min:11,max:50}))
    {
        errors["telephoneNo"] = "Please enter a valid phone number (eg 11 digits)";
        console.log("Please enter a valid phone number (eg 11 digits)");
    }

    if(req.body.telephoneNo != undefined && !validator.isNumeric(req.body.telephoneNo))
    {
        errors["telephoneNo"] = "Please enter a valid phone number (eg 11 digits)";
        console.log("Please enter a valid phone number (eg 11 digits)");
    }

    // change to regex to include white spaces with a-zA-Z


    if(req.body.postCode !== undefined && !validator.isLength(req.body.postCode,{min:5,max:8}))
    {
        errors["postCode"] = "Please enter a valid post code";
        console.log("Please enter a valid post code");
    }

    if(req.body.address !== undefined && !validator.isLength(req.body.address,{min:1,max:100}))
    {
        errors["address"] = "Please enter an address with length between 1 and 100 characters";
    }

    if(req.body.name !== undefined && !validator.isLength(req.body.name,{min:1,max:50})  && ((req.body.name).includes('zolkits') || (req.body.name).includes('Zolkits')))
    {
        errors["name"] = "Please enter an Name with length between 1 and 50 characters";
    }

    if(req.body.numberOfPupils !== undefined && (!validator.isLength(req.body.numberOfPupils,{min:1}) || req.body.numberOfPupils < 1))
    {
        errors["numberOfPupils"] = "Please enter a value";
    }

    if(req.body.numberOfClasses !== undefined && (!validator.isLength(req.body.numberOfClasses,{min:1}) || req.body.numberOfClasses < 1 ))
    {
        errors["numberOfClasses"] = "Please enter a value";
    }
    


}

exports.validateCreateUserFields = function(errors,req)
{
  validateCreateUserFields(errors,req);
}

exports.validateUser = function( errors, req )
{
    return new Promise((resolve, reject)=>{
        // populates the errors array if any errors found
        validateCreateUserFields( errors, req );
        return models.account.findOne({
            where: {
                email: req.body.email,
                deleteFl: false
            }
        }).then( async user => {
           
            if( user !== null )
            {
                // user already exists
                errors["email"] = "An account with this email already exists. Please log in";
                console.log("An account with this email already exists. Please log in");
               
            }
            if( req.body.school != undefined)
            {

              await  models.sequelize.query('select * from schools ' + 
                                ' where ( postCode = :postCode or email = :email ) ',
                                {replacements:{postCode:req.body.postCode,email:req.body.email},
                                type:models.sequelize.QueryTypes.SELECT})
                        .then(school=>{
                                if(school.length > 0 )
                                {
                                    if(school[0].postCode == req.body.postCode)
                                        errors["postCode"] = "A school with this post code already exists. Please log in";
                                    
                                    if(school[0].email == req.body.email)
                                        errors["email"] = "A school with this email already exists. Please log in";
                                    
                                }
                            })
            }
           
            resolve(errors);
        });

    });
   
}

exports.validateOrganiserSignup = async function(errors, req)
{
    return await validateOrganiserSignup(errors, req);
}

async function validateOrganiserSignup(errors, req)
{
    return new Promise((resolve, reject)=>{
        // populates the errors array if any errors found
        validateOrganiserUserFields( errors, req );

        models.account.findOne({
            where:{
                email:req.body.email,
                deleteFl:false
            }
        }).then(account=>{

            if(account != null)
                errors["account"] = "An account already exists for this email, please login";
            
            models.school.findOne({
                where:{
                    name: req.body.school,
                    postCode: req.body.postCode,
                    deleteFl: false
                }
            }).then(school=>{

                if(school != null)
                    errors["school"] = "A school already exists with this name and post code";  

                models.school.findOne({
                    where:{
                        email: req.body.email,
                        deleteFl: false
                    }
                }).then(school=>{

                    if(school != null)
                        errors["school"] = "A school already exists with this email ";  

                    resolve(errors);
                })
            })

            
        })
        
    })
}

exports.validateOrganiserUserFields = function(errors,req)
{
    return validateOrganiserUserFields(errors,req);
}

function validateOrganiserUserFields(errors,req)
{
    if(req.body.email != undefined && !validator.isEmail(req.body.email))
    {  
        errors["email"] = "Please use a valid email address";
        console.log("Please use a valid email address");
    }

    if(req.body.password != undefined && !validator.isAscii(req.body.password))
    {
        errors["password"] = "Invalid characters in password";
        console.log( "Invalid characters in password");
    }

    if(req.body.password != undefined && !validator.isLength(req.body.password,{min:5, max:25}))
    {       
        errors["password"] = "Please ensure that the password length is at least 5 characters long and no more than 25";
        console.log("Please ensure that the password length is at least 5 characters long and no more than 25");
    }

    if(req.body.rePassword != undefined && req.body.rePassword != req.body.password)
    {
        errors["password"] = "Passwords don't match";
        console.log( "Passwords don't match");
    }

    if(req.body.telephoneNo != undefined && !validator.isLength(req.body.telephoneNo,{min:11,max:50}))
    {
        errors["telephoneNo"] = "Please enter a valid phone number (eg 11 digits)";
        console.log("Please enter a valid phone number (eg 11 digits)");
    }

    if(req.body.telephoneNo != undefined && !validator.isNumeric(req.body.telephoneNo))
    {
        errors["telephoneNo"] = "Please enter a valid phone number (eg 11 digits)";
        console.log("Please enter a valid phone number (eg 11 digits)");
    }

    if(req.body.postCode !== undefined && !validator.isLength(req.body.postCode,{min:5,max:8}))
    {
        errors["postCode"] = "Please enter a valid post code";
        console.log("Please enter a valid post code");
    }

    if(req.body.address !== undefined && !validator.isLength(req.body.address,{min:1,max:100}))
    {
        errors["address"] = "Please enter an address with length between 1 and 100 characters";
    }

    if(req.body.name !== undefined && !validator.isLength(req.body.name,{min:1,max:50})  && ((req.body.name).includes('zolkits') || (req.body.name).includes('Zolkits')))
    {
        errors["name"] = "Please enter an Name with length between 1 and 50 characters";
    }

    if(req.body.numberOfKidsPerClass !== undefined && !validator.isNumeric(req.body.numberOfKidsPerClass) && (req.body.numberOfKidsPerClass).length < 12)
    {
        errors["numberOfKidsPerClass"] = "Please enter a number";
    }

    var classArray = req.body['classArray[]'];

    if(classArray != null || classArray != undefined)
    {
        try
        {
            validateClasses(classArray,errors,req)
        }
        catch(err)
        {
            console.log(err);
        }
    }
}

function validateClasses(classArray,errors,req)
{
    var classSet = new Set();

    for(var i = 0; i < classArray.length; i++)
    {
        var index = classArray[i];
        var classValue = req.body['class' + index]
        classSet.add(classValue);

        if(onlySpaces(classValue))
            errors["class" + index] = "Please enter a correct class name";
    }

    if(classSet.size != classArray.length)
    {
        errors["classes"] = "A class name has been entered more than once. No duplicate class names allowed"
        return;
    }
}

function onlySpaces(str) {
    return str.trim().length === 0;
}