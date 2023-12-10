const models = require('../models');
const basketController = require('./BasketController');
const kidController = require('./KidController');
const basketUtility = require('../utility/basket/basketUtility');
const accountUtility = require('../utility/account/accountUtility');
const kidUtility = require('../utility/kid/kidUtility');

async function getParentScreen(req, res) {
  const account = req.user;
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
  const isKidsLinkedToAccount = await kidUtility.isKidLinkedToAccountId(account.id);

  const kids = await kidUtility.getKidsFromAccountId(account.id);
  res.render('parentDashboard3', {
    user: account,
    basketItemsDetails,
    isKidsLinkedToAccount,
    kids,
  });
}

async function isDisplayShippingSectionDetail(accountId) {
  const isKidLinkedToAccountId = await accountUtility.isAccountLinkedToASchoolInScheme(accountId);
  // find a linked school to account whose deadline has not passed
  const isDisplayCalendarsOptions = await basketController.getIsDisplayCalendarsOptions(accountId);

  if (!isKidLinkedToAccountId) {
    return { isDisplayShippingSection: true, displayMessage: true, isDisplayCalendarOptions: isDisplayCalendarsOptions };
  }

  let schoolsWithPassedDeadlines = await models.sequelize.query(' select count(s.id) as count from statuses s '
                            + ' inner join schools sc on s.schoolFk = sc.id '
                            + ' inner join statusTypes st on s.statusTypeFk = st.id '
                            + ' where st.type = :type '
                            + ' and sc.id in (select sch.id from schools sch '
                            + ' inner join classes c on c.schoolFk = sch.id '
                            + ' inner join kids k on k.classFk = c.id '
                            + ' where k.parentAccountFk = :accountId ) ', { replacements: { accountId, type: 'Printing' }, type: models.sequelize.QueryTypes.SELECT });
  schoolsWithPassedDeadlines = schoolsWithPassedDeadlines[0].count;

  if (schoolsWithPassedDeadlines === 0) {
    // dont display shipping
    return { isDisplayShippingSection: false, displayMessage: false, isDisplayCalendarsOptions };
  }

  // display shipping
  return { isDisplayShippingSection: true, displayMessage: false, isDisplayCalendarsOptions };
}

module.exports = {
  getParentScreen,
  isDisplayShippingSectionDetail,

};
