let validator = require('validator');

exports.validateConfirmAmountDetails= function( errors, req )
{
    if(!validator.isNumeric(req.body.bankAcc))
    {
        errors["bankAcc"] = "Please enter a valid bank account number, must not contain characters";
        console.log("Please enter a valid bank number");
    }

    if(!validator.isLength(req.body.bankAcc,{min:8, max:8}))
    {
        errors["bankAcc"] = "Bank account number must contain 8 digits only";
        console.log("Please enter a valid bank number");
    }

    if( !validator.isNumeric(req.body.sortCode) )
    {
        errors["sortCode"] = "Please enter a valid sort code, must not contain characters";
        console.log("Please enter a valid sort code");
    }

    if(!validator.isLength(req.body.sortCode,{min:6, max:6}))
    {
        errors["sortCode"] = "Sort Code must contain 6 digits only";
        console.log("Please enter a valid sort code");
    }


    return errors;
}