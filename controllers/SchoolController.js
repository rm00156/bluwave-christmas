const models = require('../models');
const kidController = require('./KidController');
const queueController = require('./QueueController');
const confirmAmountValidator = require('../validators/confirmAmount');
const schoolUtility = require('../utility/school/schoolUtility');
const productItemUtility = require('../utility/product/productItemUtility');
const productUtility = require('../utility/product/productUtility');
const classUtility = require('../utility/class/classUtility');
const kidUtility = require('../utility/kid/kidUtility');
const basketUtility = require('../utility/basket/basketUtility');
const orderUtility = require('../utility/order/orderUtility');
const adminUtility = require('../utility/admin/adminUtility');

const { STATUS_TYPES_ID } = require('../utility/school/statusTypes');

async function getSearchSchoolsPage(req, res) {
  const statusTypes = await schoolUtility.getAllStatusTypes();
  const backgroundSetting = await adminUtility.getBackgroundSetting(
    req.user.id,
  );
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('newAdminSchools', {
    user: req.user,
    statusTypes,
    ordersNotShipped,
    backgroundSetting,
    schoolsRequiringGiveBackAction,
  });
}

async function getSchoolPage(req, res) {
  const schoolNumber = req.query.number;

  // redo to account for steps where next step is null to now account for the waiting step
  const school = await schoolUtility.getSchoolDetailsBySchoolNumber(
    schoolNumber,
  );

  // put a check to see if the school is null
  // if so throw some sort of error etc etc
  const giveBackDetails = await schoolUtility.getGiveBackAmount(school.id);
  const giveBackTotal = giveBackDetails == null ? 0.0 : giveBackDetails.giveBackTotal;
  const nextSteps = await schoolUtility.getNextStepsForStatusType(
    school.nextTypeFk,
    school.typeId,
  );

  const classes = await classUtility.getClassDetailsFromSchoolNumber(
    schoolNumber,
  );

  const classTotal = classes.length;
  const deadLine = await schoolUtility.getSchoolDeadlineBySchoolId(school.id);

  const deadlineDetail = schoolUtility.getDeadlineDetails(deadLine);
  const { deadLineDttm } = deadlineDetail;
  const { daysLeft } = deadlineDetail;
  const { daysLeftSign } = deadlineDetail;

  const orderDetails = await schoolUtility.getOrderDetailsForAllKidsFromSchoolId(school.id);
  const backgroundSetting = await adminUtility.getBackgroundSetting(
    req.user.id,
  );
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const statusTypeDetails = await schoolUtility.getStatusTypeDetailsForSchoolId(
    school.id,
  );
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('newSchoolDetail', {
    user: req.user,
    school,
    classList: classes,
    orderDetails,
    classTotal,
    deadLineDttm,
    daysLeft,
    daysLeftSign,
    nextSteps,
    giveBackTotal,
    statusTypeDetails,
    backgroundSetting,
    ordersNotShipped,
    schoolsRequiringGiveBackAction,
  });
}

async function searchSchoolsResults(req, res) {
  const {
    nameSearch, addressSearch, postCodeSearch, emailSearch, status,
  } = req.body;

  const searchResult = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail(
    nameSearch,
    addressSearch,
    postCodeSearch,
    status,
    emailSearch,
  );

  res.json({ result: searchResult });
}

async function removeClass(req, res) {
  const { classId } = req.body;
  const kids = await kidUtility.getKidsFromClassId(classId);

  if (kids.length > 0) return res.json({ errors: [] });

  const t = await models.sequelize.transaction();

  try {
    await schoolUtility.deleteClass(classId);
  } catch (err) {
    console.log(err);
    await t.rollback();
    return res.json({ errors: [] });
  }

  await t.commit();

  return res.json({});
}

async function addNewClass(req, res) {
  const { schoolId } = req.body;
  const { className } = req.body;

  const isValid = await schoolUtility.isValidClassForSchool(
    schoolId,
    className,
  );

  if (isValid) {
    const transaction = await models.sequelize.transaction();

    try {
      await schoolUtility.createClass(className, schoolId, 31);
    } catch (err) {
      await transaction.rollback();
      return console.log(err);
    }

    await transaction.commit();

    return res.json({});
  }
  return res.json({ errors: [] });
}

async function changeSchoolStep(req, res) {
  const { schoolId } = req.body;
  let { nextTypeFk } = req.body;

  let statusDetail;
  if (nextTypeFk === '') {
    statusDetail = await schoolUtility.getCurrentSchoolsStatusDetailsBySchoolId(
      schoolId,
    );
  } else {
    statusDetail = { nextTypeFk, type: '' };
  }

  if (statusDetail.nextTypeFk != null) {
    nextTypeFk = statusDetail.nextTypeFk;
    await schoolUtility.createNewStatusForSchoolId(schoolId, nextTypeFk);
  }

  res.json({ statusDetail });
}

async function getGiveBacksScreen(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(
    req.user.id,
  );
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();

  const giveBackAmountDetailsForEachSchool = await schoolUtility.getGiveBackAmountDetailsForEachSchool();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('giveBackAmounts', {
    user: req.user,
    giveBackAmountDetailsForEachSchool,
    backgroundSetting,
    ordersNotShipped,
    schoolsRequiringGiveBackAction,
  });
}

async function getDeadlinesScreen(req, res) {
  const backgroundSetting = await adminUtility.getBackgroundSetting(
    req.user.id,
  );
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const deadlines = await schoolUtility.getAllDeadlines();

  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

  res.render('deadlines', {
    user: req.user,
    schoolsRequiringGiveBackAction,
    backgroundSetting,
    deadlines,
    ordersNotShipped,
  });
}

async function continues(req, res) {
  // move to worker
  const errors = [];
  const account = req.user;
  let basketItemsDetails = null;
  if (account != null) {
    basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
  }
  const { verificationCode } = req.query;

  const deadline = await schoolUtility.getSchoolDeadlineByVerificationCode(
    verificationCode,
  );

  if (deadline == null) {
    errors.push('Invalid Request');
    // break
    return res.render('continue2', {
      user: req.user,
      errors,
      basketItemsDetails,
    });
  }
  const school = await schoolUtility.getSchoolFromSchoolId(deadline.schoolFk);

  const date = new Date(deadline.deadLineDttm);

  if (deadline.continueFl === true) {
    // means we have already had a response
    errors.push(
      `We have already received a response and the status for ${
        school.name
      } is already at ${deadline.continueFl === true ? 'Printing' : 'Delayed'}`,
    );
    // break
    return res.render('continue2', {
      user: req.user,
      school: school.name,
      errors,
      basketItemsDetails,
    });
  }
  if (date.getTime() > Date.now()) {
    // deadline has not passed
    errors.push('Invalid Request');
    return res.render('continue2', {
      user: req.user,
      school: school.name,
      errors,
      basketItemsDetails,
    });
    // break
  }
  const printStatus = await schoolUtility.getSchoolStatusByStatusTypeId(
    school.id,
    STATUS_TYPES_ID.PRINTING,
  );

  if (printStatus == null) {
    // change to print status
    await schoolUtility.changeSchoolToPrintStatus(school.id, true);
    return res.render('continue2', {
      user: req.user,
      school: school.name,
      errors,
      basketItemsDetails,
    });
  }
  errors.push(`Printing has already started for ${school.name}`);
  return res.render('continue2', {
    user: req.user,
    school: school.name,
    errors,
    basketItemsDetails,
  });
}

async function setDeadLine(req, res) {
  // case where new deadline

  const { schoolId } = req.body;
  const { deadLineDttm } = req.body;

  const deadLine = await schoolUtility.getSchoolDeadlineBySchoolId(schoolId);

  if (deadLine == null) {
    const verificationCode = await schoolUtility.createVerificationCodeForDeadline();
    // means new entry
    await schoolUtility.createDeadlineForSchoolId(
      schoolId,
      deadLineDttm,
      verificationCode,
    );
  } else if (deadLine.deadLineDttm !== deadLineDttm) {
    await schoolUtility.resetDeadlineDttmForSchoolId(schoolId, deadLineDttm);
  }

  res.json({ success: 'success' });
}

async function delay(req, res) {
  const errors = [];
  const account = req.user;
  let basketItemsDetails = null;
  if (account != null) {
    basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
  }
  const { verificationCode } = req.query;
  const deadline = await schoolUtility.getSchoolDeadlineByVerificationCode(
    verificationCode,
  );

  if (deadline == null) {
    errors.push('Invalid Request');
    return res.render('delay2', { user: req.user, errors, basketItemsDetails });
  }

  const school = await schoolUtility.getSchoolFromSchoolId(deadline.schoolFk);

  const isSchoolStartedPrintingOrBeenDelayed = await schoolUtility.hasSchoolStartedPrintingOrBeenDelayed(school.id);
  if (isSchoolStartedPrintingOrBeenDelayed) {
    // already been delayed or continued
    errors.push('Invalid Request');
  } else {
    const newDeadline = new Date(deadline.deadLineDttm);
    const window = new Date();
    window.setDate(newDeadline.getDate() + 3);

    if (newDeadline.getTime() > Date.now()) {
      // we havent passed deadline
      errors.push('Invalid Request');
    } else if (window.getTime() < Date.now()) {
      // window passed
      errors.push(
        'The 3 day window to delay has passed, so the printing process has started.',
      );
    } else {
      // delay

      await schoolUtility.createNewStatusForSchoolId(
        school.id,
        STATUS_TYPES_ID.DELAY,
      );

      await schoolUtility.delayDeadlineForSchoolId(school.id);
    }
  }

  return res.render('delay2', {
    user: req.user,
    errors,
    school: school.name,
    basketItemsDetails,
  });
}

async function displayLinkSchoolButton(req, res) {
  const { productItemId } = req.query;

  const productItem = await productItemUtility.getProductItemById(
    productItemId,
  );

  if (productItem == null) return res.json({ displayLinkSchoolButton: false });

  return res.json({ displayLinkSchoolButton: productItem.classFk == null });
}

// either create a language file for these error messages, or create consts/ enum error class, more likely the latter
async function linkKidByProductItemId(req, res) {
  const { productItemId } = req.body;
  const { classCode } = req.body;

  const productItem = await productItemUtility.getProductItemById(
    productItemId,
  );
  if (productItem == null) {
    // error
    return res.json({ code: 'Please Contact Support as an unexpected error has occured.' });
  }

  const classAndSchool = await classUtility.getClassAndSchoolByClassNumber(
    classCode,
  );

  if (classAndSchool == null) {
    // error
    return res.json({ code: 'The class code or school code you entered is not valid, please make sure you have entered the codes correctly' });
  }

  const product = await productUtility.getProductFromProductItemId(
    productItemId,
  );

  if (product == null) {
    // error
    return res.json({ code: 'Please Contact Support as an unexpected error has occured.' });
  }

  if (product.kidFl) {
    const kid = await kidUtility.getKidByProductItemId(productItemId);

    const schoolClass = await classUtility.getClassByNumber(classCode);

    await kidUtility.addKidToClass(kid.id, schoolClass.id);
  }

  await productItemUtility.setClassForProductItemByProductItemGroupId(
    classAndSchool.classId,
    productItem.productItemGroupFk,
  );

  return res.json({});
}

async function confirmAmount(req, res) {
  const account = req.user;
  const basketItems = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

  const school = await schoolUtility.getSchoolFromAccountId(account.id);

  if (school == null) return res.redirect('/organiserDashboard');

  const charityAmount = await schoolUtility.getCharityAmount(school.id);

  if (charityAmount == null) return res.redirect('/organiserDashboard');

  const giveBackAmountBreakDownPerClass = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
  const classes = giveBackAmountBreakDownPerClass.classesData;
  const { totalGiveBackAmount } = giveBackAmountBreakDownPerClass;

  return res.render('confirmAmount2', {
    user: req.user,
    basketItemsDetails: basketItems,
    classes,
    totalGiveBackAmount,
    charityAmount,
  });
}

async function getSubmitBankDetails(req, res) {
  const account = req.user;

  const school = await schoolUtility.getSchoolFromAccountId(account.id);
  if (school == null) return res.redirect('/organiserDashboard');

  const charityAmount = await schoolUtility.getCharityAmount(school.id);

  if (charityAmount === null || charityAmount.confirmedFl === true) return res.redirect('/organiserDashboard');

  const giveBackAmountBreakDownPerClass = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
  const { totalGiveBackAmount } = giveBackAmountBreakDownPerClass;
  const basketItems = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

  if (charityAmount.amount !== totalGiveBackAmount) {
    await schoolUtility.resetCharityAmount(
      totalGiveBackAmount,
      charityAmount.id,
    );
    charityAmount.amount = totalGiveBackAmount;
  }

  return res.render('submitBankDetails', {
    user: req.user,
    basketItemsDetails: basketItems,
    charityAmount,
  });
}

async function submitConfirmAmount(req, res) {
  const errors = confirmAmountValidator.validateConfirmAmountDetails(req);

  if (errors && (errors.sortCode || errors.bankAcc)) {
    console.log('err');
    return res.json({ errors });
  }

  const account = req.user;

  const school = await schoolUtility.getSchoolFromAccountId(account.id);
  await schoolUtility.confirmCharityAmountBySchoolId(school.id);

  await schoolUtility.createNewStatusForSchoolId(
    school.id,
    STATUS_TYPES_ID.CONFIRMED_CHARITABLE_CONTRIBUTION,
  );

  await queueController.addSendConfirmationDetailEmailJob(
    school.id,
    req.body.name,
    req.body.bankAcc,
    req.body.sortCode,
    req.body.type,
  );

  return res.json({ success: 'success' });
}

async function getGiveBackDetailsScreen(req, res) {
  const { schoolNumber } = req.query;
  const school = await schoolUtility.getSchoolFromSchoolNumber(schoolNumber);

  if (school == null) return res.redirect('/give_back');

  const giveBackAmountBreakDownPerClass = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
  const classes = giveBackAmountBreakDownPerClass.classesData;
  const { totalGiveBackAmount } = giveBackAmountBreakDownPerClass;
  const backgroundSetting = await adminUtility.getBackgroundSetting(
    req.user.id,
  );
  const ordersNotShipped = await orderUtility.getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();
  const charityAmount = await schoolUtility.getCharityAmount(school.id);

  const schoolRequiresAction = schoolsRequiringGiveBackAction.filter(
    (o) => o.schoolFk === school.id,
  );
  return res.render('giveBackDetails', {
    user: req.user,
    school,
    classes,
    totalGiveBackAmount,
    backgroundSetting,
    ordersNotShipped,
    schoolRequiresAction: schoolRequiresAction.length > 0,
    schoolsRequiringGiveBackAction,
    charityAmount,
  });
}

module.exports = {
  continues,
  getDeadlinesScreen,
  getGiveBacksScreen,
  changeSchoolStep,
  getSearchSchoolsPage,
  getSchoolPage,
  searchSchoolsResults,
  removeClass,
  addNewClass,
  setDeadLine,
  delay,
  displayLinkSchoolButton,
  linkKidByProductItemId,
  confirmAmount,
  getSubmitBankDetails,
  submitConfirmAmount,
  getGiveBackDetailsScreen,
};
