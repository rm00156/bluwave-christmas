const models = require('../models');
const basketController = require('../controllers/BasketController');
const kidController = require('../controllers/KidController');
const basketUtility = require('../utility/basket/basketUtility');

exports.getParentScreen = async function(req,res) {
    const account = req.user;
    var basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    var isKidsLinkedToAccount = await kidController.isKidLinkedToAccountId(account.id);

    var kids = await kidController.getKidsFromAccountId(account.id);
    res.render('parentDashboard3',{user:account, basketItemsDetails:basketItemsDetails,
        isKidsLinkedToAccount:isKidsLinkedToAccount, kids:kids});
                        
}

exports.isDisplayShippingSectionDetail = async function(accountId)
{
    var isKidLinkedToAccountId = await kidController.isAccountLinkedToASchoolInScheme(accountId);
    // find a linked school to account whose deadline has not passed
    var isDisplayCalendarsOptions = await basketController.getIsDisplayCalendarsOptions(accountId);

    if(!isKidLinkedToAccountId)
    {
        return { isDisplayShippingSection: true, displayMessage: true, isDisplayCalendarOptions: isDisplayCalendarsOptions};
    }
    else
    {   
        var schoolsWithPassedDeadlines = await models.sequelize.query(' select count(s.id) as count from statuses s ' + 
                            ' inner join schools sc on s.schoolFk = sc.id ' +
                            ' inner join statusTypes st on s.statusTypeFk = st.id ' + 
                            ' where st.type = :type ' + 
                            ' and sc.id in (select sch.id from schools sch ' +
                            ' inner join classes c on c.schoolFk = sch.id ' + 
                            ' inner join kids k on k.classFk = c.id ' + 
                            ' where k.parentAccountFk = :accountId ) ',{replacements:{accountId:accountId,type:'Printing'},type:models.sequelize.QueryTypes.SELECT})
        schoolsWithPassedDeadlines = schoolsWithPassedDeadlines[0].count;
        
        if(schoolsWithPassedDeadlines == 0)
        {
            // dont display shipping
            return { isDisplayShippingSection: false, displayMessage: false, isDisplayCalendarsOptions:isDisplayCalendarsOptions};
        }
        else
        {
            // display shipping
            return { isDisplayShippingSection: true, displayMessage: false, isDisplayCalendarsOptions:isDisplayCalendarsOptions};
        }
    }
}