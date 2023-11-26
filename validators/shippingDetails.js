let validator = require('validator');
const fetch = require('node-fetch');

exports.validateShippingDetailFields = async function(errors,req)
{
    await validateShippingDetailFields(errors,req);
}

const validateShippingDetailFields = async function( errors, req )
{
    if(req.body.postCode == undefined || req.body.postCode.length == 0)
    {
        errors["postCode"] = "Please enter a valid Post Code";
    }

    if(req.body.postCode.length > 0)
    {
        if(req.body.country !== undefined && req.body.country == 235)
        {
            var response = await fetch('https://api.postcodes.io/postcodes/' + req.body.postCode);
            response = await response.json();
            if(response.status != 200)
                errors["postCode"] = response.error;
                
        }
    }

    if(req.body.fullName !== undefined && !validator.isLength(req.body.fullName,{min:3}))
    {
        errors["fullName"] = "Full Name must be more than 3 characters long";
    }

    if(req.body.addressLine1 !== undefined && !validator.isLength(req.body.addressLine1,{min:3}))
    {
        errors["addressLine1"] = "Address Line 1 must be more than 3 characters long";
    }

    if(req.body.addressLine2 !== undefined && !validator.isLength(req.body.addressLine2,{min:3}))
    {
        errors["addressLine2"] = "Address Line 2 must be more than 3 characters long";
    }

    if(req.body.city !== undefined && !validator.isLength(req.body.city,{min:3}))
    {
        errors["city"] = "City must be more than 3 characters long";
    }

    
}