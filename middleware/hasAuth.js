const models = require('../models');

exports.isLoggedIn = (req, res, next )=>{

    if(req.user)
        next();
    else
        res.redirect('/');

    // If you pass any parameter to the next function, express regards the request as being an error and will skip any 
    // remaining non erro-handling routing and middleware functions
}

exports.hasAdminAuth = (req,res,next)=>{
    if(req.user && req.user.accountTypeFk == 1)
        next();
    else
        res.redirect('/');
}

exports.hasParentAuth = (req,res,next)=>{
    if(req.user && (req.user.accountTypeFk == 2 || req.user.accountTypeFk == 3 ) ) 
        next();
    else
        res.redirect('/');
}

exports.hasOrganiserOrAdminAuth = (req,res,next)=>{
    if(req.user && (req.user.accountTypeFk == 1 || req.user.accountTypeFk == 3 ) ) 
        next();
    else
        res.redirect('/');
}


exports.hasOrganiserAuth = (req,res,next)=>{
    if(req.user && ( req.user.accountTypeFk == 3) ) 
        next();
    else
        res.redirect('/');
}

exports.hasDefaultPasswordAuth = (req,res,next)=>{
    if(req.user && req.user.defaultPassword == false)
        next();
    else
        res.redirect('/updatePassword')
}

// exports.hasBasketAuth = (req,res,next)=>{
    
//     models.kid.findOne({
//         where:{
//             parentAccountFk:req.user.id
//         }
//     }).then(kid=>{

//         if(kid == null)
//         {
//             if(req.user.accountTypeFk == 2)
//             {
//                 res.redirect('/parentDashboard');
//             } 
//             else
//             {
//                 res.redirect('/organiserDashboard');
//             }
//         }
//         else
//         {
//             next();
//         }
//     })
    
// }

exports.organiserCreatedCard = async function(req,res,next)
{
    var kidId = req.query.id;

    if(req.user.accountTypeFk == 3)
    {
        var card = await models.card.findOne({
            where:{
                kidFk:kidId
            }
        });
    
        if(card == null)
        {
            var classId = await models.kid.findOne({
                where:{
                    id:kidId
                }
            }).then(kid=>{
                return kid.classFk;
            })

            return res.redirect('/classParticipants?classId=' + classId);
        }

    }
   
    return next();
}

exports.redirectToDashboard = async function(req,res,next)
{
    var account = req.user;

    if(account == null)
        return next();
    
    if(account.accountTypeFk == 1)
        return res.redirect('/adminDashboard');
    else if(account.accountTypeFk == 2)
        return res.redirect('/parentDashboard');
    else
        return res.redirect('/organiserDashboard');
        
}
