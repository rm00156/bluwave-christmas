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
const accountUtility = require('../utility/account/accountUtility');

const {STATUS_TYPES_ID}  = require('../utility/school/statusTypes');

exports.getSearchSchoolsPage = async function (req, res) {
    var statusTypes = await schoolUtility.getAllStatusTypes();
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('newAdminSchools', {
        user: req.user, statusTypes: statusTypes, ordersNotShipped: ordersNotShipped,
        backgroundSetting: backgroundSetting, schoolsRequiringGiveBackAction: schoolsRequiringGiveBackAction
    })
}

exports.getSchoolPage = async function (req, res) {

    const schoolNumber = req.query.number;

    // redo to account for steps where next step is null to now account for the waiting step
    const school = await schoolUtility.getSchoolDetailsBySchoolNumber(schoolNumber);

    // put a check to see if the school is null
    // if so throw some sort of error etc etc
    var giveBackDetails = await schoolUtility.getGiveBackAmount(school.id);
    var giveBackTotal = giveBackDetails == null ? 0.00 : giveBackDetails.giveBackTotal;
    var nextSteps = await schoolUtility.getNextStepsForStatusType(school.nextTypeFk, school.typeId)


    var classes = await classUtility.getClassDetailsFromSchoolNumber(schoolNumber);

    var classTotal = classes.length;
    var deadLine = await schoolUtility.getSchoolDeadlineBySchoolId(school.id);

    var deadlineDetail = schoolUtility.getDeadlineDetails(deadLine);
    var deadLineDttm = deadlineDetail.deadLineDttm;
    var daysLeft = deadlineDetail.daysLeft;
    var daysLeftSign = deadlineDetail.daysLeftSign;

    var orderDetails = await schoolUtility.getOrderDetailsForAllKidsFromSchoolId(school.id);
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var statusTypeDetails = await schoolUtility.getStatusTypeDetailsForSchoolId(school.id);
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('newSchoolDetail', {
        user: req.user, school: school, classList: classes, orderDetails: orderDetails, classTotal: classTotal,
        deadLineDttm: deadLineDttm, daysLeft: daysLeft, daysLeftSign: daysLeftSign,
        nextSteps: nextSteps, giveBackTotal: giveBackTotal, statusTypeDetails: statusTypeDetails,
        backgroundSetting: backgroundSetting, ordersNotShipped: ordersNotShipped,
        schoolsRequiringGiveBackAction: schoolsRequiringGiveBackAction
    });
}

exports.searchSchoolsResults = async function (req, res) {
    var nameSearch = req.body.nameSearch;
    var addressSearch = req.body.addressSearch;
    var postCodeSearch = req.body.postCodeSearch;
    var emailSearch = req.body.emailSearch;
    var status = req.body.status;

    var searchResult = await schoolUtility.searchForSchoolByNameAddressPostCodeStatusAndEmail(nameSearch, addressSearch, postCodeSearch, status, emailSearch);
    
    res.json({ result: searchResult });
}

exports.updateSchoolDetailsForSchoolId = async function (schoolId, schoolName, address, postCode, number, organiserName, additionalInfo, numberOfKidsPerClass) {
    var t = await models.sequelize.transaction();

    try {

        await schoolUtility.updateSchoolById(schoolId, schoolName, address,
            postCode, number, additionalInfo, numberOfKidsPerClass);

        var school = await schoolUtility.getSchoolFromSchoolId(schoolId);
        
        await accountUtility.updateAccountNameAndNumber(school.organiserAccountFk, organiserName, number);

    } catch (err) {
        console.log(err);
        if (err)
            return await t.rollback()
    }

    t.commit();

}

exports.removeClass = async function (req, res) {
    var classId = req.body.classId;
    var kids = await kidController.getKidsFromClassId(classId);

    if (kids.length > 0)
        return res.json({ errors: [] });

    var t = await models.sequelize.transaction();

    try {
        await schoolUtility.deleteClass(classId);
    }
    catch (err) {
        console.log(err);
        return await t.rollback();
    }

    await t.commit();

    res.json({});
}

exports.addNewClass = async function (req, res) {
    var schoolId = req.body.schoolId;
    var className = req.body.className;

    var isValid = await schoolUtility.isValidClassForSchool(schoolId, className);

    if (isValid) {
        var transaction = await models.sequelize.transaction();

        try {
            await schoolUtility.createClass(className, schoolId, 31)
        }
        catch (err) {
            await transaction.rollback();
            return console.log(err)
        }

        await transaction.commit();

        res.json({})
    }
    else {
        res.json({ errors: [] })
    }
}

exports.changeSchoolStep = async function (req, res) {
    var schoolId = req.body.schoolId;
    var nextTypeFk = req.body.nextTypeFk;

    var statusDetail;
    if (nextTypeFk == '') {
        statusDetail = await schoolUtility.getCurrentSchoolsStatusDetailsBySchoolId(schoolId);
    } else {
        statusDetail = { nextTypeFk: nextTypeFk, type: '' };
    }

    if (statusDetail.nextTypeFk != null) {
        nextTypeFk = statusDetail.nextTypeFk;
        await schoolUtility.createNewStatusForSchoolId(schoolId, nextTypeFk);
    }

    res.json({ statusDetail: statusDetail });
}

exports.getGiveBacksScreen = async function (req, res) {
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();

    var giveBackAmountDetailsForEachSchool = await schoolUtility.getGiveBackAmountDetailsForEachSchool();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('giveBackAmounts', {
        user: req.user, giveBackAmountDetailsForEachSchool: giveBackAmountDetailsForEachSchool,
        backgroundSetting: backgroundSetting, ordersNotShipped: ordersNotShipped, schoolsRequiringGiveBackAction: schoolsRequiringGiveBackAction
    });
}

exports.getDeadlinesScreen = async function (req, res) {
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var deadLines = await schoolUtility.getAllDeadlines();

    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();

    res.render('deadlines', {
        user: req.user, schoolsRequiringGiveBackAction: schoolsRequiringGiveBackAction,
        backgroundSetting: backgroundSetting, deadLines: deadLines, ordersNotShipped: ordersNotShipped
    });
}

exports.continue = async function (req, res) {
    // move to worker
    var errors = new Array();
    var account = req.user;
    var basketItemsDetails = null;
    if (account != null) {
        basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    }
    var verificationCode = req.query.verificationCode;

    var deadline = await schoolUtility.getSchoolDeadlineByVerificationCode(verificationCode);

    if (deadline == null) {
        errors.push('Invalid Request')
        //break
        return res.render('continue2', { user: req.user, errors: errors, basketItemsDetails: basketItemsDetails });
    }
    var school = await schoolUtility.getSchoolFromSchoolId(deadline.schoolFk);

    var date = new Date(deadline.deadLineDttm);

    if (deadline.continueFl == true) {
        // means we have already had a response
        errors.push('We have already received a response and the status for ' + school.name + ' is already at ' + (deadline.continueFl == true ? 'Printing' : 'Delayed'));
        //break
        return res.render('continue2', { user: req.user, school: school.name, errors: errors, basketItemsDetails: basketItemsDetails });

    } else if (date.getTime() > Date.now()) {
        // deadline has not passed
        errors.push('Invalid Request');
        return res.render('continue2', { user: req.user, school: school.name, errors: errors, basketItemsDetails: basketItemsDetails });
        // break
    } else {
        var printStatus = await models.status.findOne({
            where: {
                schoolFk: school.id,
                statusTypeFk: STATUS_TYPES_ID.PRINTING
            }
        })

        if (printStatus == null) {
            // change to print status
            await schoolUtility.changeSchoolToPrintStatus(school.id, true);
            res.render('continue2', { user: req.user, school: school.name, errors: errors, basketItemsDetails: basketItemsDetails });
        } else {
            errors.push('Printing has already started for ' + school.name);
            res.render('continue2', { user: req.user, school: school.name, errors: errors, basketItemsDetails: basketItemsDetails });
        }

    }
}

exports.setDeadLine = async function (req, res) {
    // case where new deadline

    const schoolId = req.body.schoolId;
    var deadLineDttm = req.body.deadLineDttm;

    var deadLine = await schoolUtility.getSchoolDeadlineBySchoolId(schoolId);

    if (deadLine == null) {
        var verificationCode = await schoolUtility.createVerificationCodeForDeadline();
        // means new entry
        await schoolUtility.createDeadlineForSchoolId(schoolId, deadLineDttm, verificationCode);
    } else {
        if (deadLine.deadLineDttm != deadLineDttm) {
            await schoolUtility.resetDeadlineDttmForSchoolId(schoolId, deadLineDttm); 
        }
    }

    res.json({ success: "success" });
}

exports.delay = async function (req, res) {
    var errors = new Array();
    var account = req.user;
    var basketItemsDetails = null;
    if (account != null) {
        basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    }
    var verificationCode = req.query.verificationCode;
    var deadline = await schoolUtility.getSchoolDeadlineByVerificationCode(verificationCode);

    if (deadline == null) {
        errors.push('Invalid Request');
        return res.render('delay2', { user: req.user, errors: errors, basketItemsDetails: basketItemsDetails });
    }

    var school = await schoolUtility.getSchoolFromSchoolId(deadline.schoolFk);

    const isSchoolStartedPrintingOrBeenDelayed = await schoolUtility.hasSchoolStartedPrintingOrBeenDelayed(school.id);
    if (isSchoolStartedPrintingOrBeenDelayed) {
        // already been delayed or continued
        errors.push('Invalid Request');
    } else {
        var deadline = new Date(deadline.deadLineDttm);
        var window = new Date();
        window.setDate(deadline.getDate() + 3);

        if (deadline.getTime() > Date.now()) {
            // we havent passed deadline
            errors.push('Invalid Request');
        } else if (window.getTime() < Date.now()) {
            // window passed
            errors.push('The 3 day window to delay has passed, so the printing process has started.')
        } else {
            // delay

            await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES_ID.DELAY);

            await schoolUtility.delayDeadlineForSchoolId(school.id);
        }
    }

    res.render('delay2', { user: req.user, errors: errors, school: school.name, basketItemsDetails: basketItemsDetails });
}

exports.displayLinkSchoolButton = async function (req, res) {
    var productItemId = req.query.productItemId;

    var productItem = await productItemUtility.getProductItemById(productItemId);

    if (productItem == null)
        return res.json({ displayLinkSchoolButton: false });

    return res.json({ displayLinkSchoolButton: (productItem.classFk == null) });
}

// either create a language file for these error messages, or create consts/ enum error class, more likely the latter
exports.linkKidByProductItemId = async function (req, res) {

    var productItemId = req.body.productItemId;
    var classCode = req.body.classCode;

    var productItem = await productItemUtility.getProductItemById(productItemId); 
    if (productItem == null) {
        var errors = {
            code: "Please Contact Support as an unexpected error has occured."
        }
        // error
        return res.json({ errors: errors });
    }

    var classAndSchool = await classUtility.getClassAndSchoolByClassNumber(classCode);

    if (classAndSchool == null) {
        var errors = {
            code: "The class code or school code you entered is not valid, please make sure you have entered the codes correctly"
        }
        // error
        return res.json({ errors: errors });
    }

    var product = await productUtility.getProductFromProductItemId(productItemId);

    if (product == null) {
        var errors = {
            code: "Please Contact Support as an unexpected error has occured."
        }
        // error
        return res.json({ errors: errors });
    }

    if (product.kidFl) {
        var kid = await kidUtility.getKidByProductItemId(productItemId);
        kid = kid[0];

        var schoolClass = await classUtility.getClassByNumber(classCode);

        await kidUtility.addKidToClass(kid.id, schoolClass.id);
    }

    await productItemUtility.setClassForProductItemByProductItemGroupId(classAndSchool.classId, productItem.productItemGroupFk);

    return res.json({});
}

exports.confirmAmount = async function (req, res) {
    var account = req.user;
    var basketItems = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

    var school = await schoolUtility.getSchoolFromAccountId(account.id);

    if (school == null)
        return res.redirect('/organiserDashboard');

    var charityAmount = await schoolUtility.getCharityAmount(school.id);

    if (charityAmount == null)
        return res.redirect('/organiserDashboard');

    var giveBackAmountBreakDownPerClass = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
    var classes = giveBackAmountBreakDownPerClass.classesData;
    var totalGiveBackAmount = giveBackAmountBreakDownPerClass.totalGiveBackAmount;

    res.render('confirmAmount2', {
        user: req.user, basketItemsDetails: basketItems, classes: classes,
        totalGiveBackAmount: totalGiveBackAmount, charityAmount: charityAmount
    });

}

exports.getSubmitBankDetails = async function (req, res) {
    var account = req.user;

    var school = await schoolUtility.getSchoolFromAccountId(account.id); 
    if (school == null)
        return res.redirect('/organiserDashboard');

    var charityAmount = await schoolUtility.getCharityAmount(school.id);

    if (charityAmount == null || charityAmount.confirmedFl == true)
        return res.redirect('/organiserDashboard');


    var giveBackAmountBreakDownPerClass = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
    var totalGiveBackAmount = giveBackAmountBreakDownPerClass.totalGiveBackAmount;
    var basketItems = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

    if (charityAmount.amount != totalGiveBackAmount) {
        await schoolUtility.resetCharityAmount(totalGiveBackAmount, charityAmount.id);
        charityAmount[amount] = totalGiveBackAmount;
    }

    res.render('submitBankDetails', { user: req.user, basketItemsDetails: basketItems, charityAmount: charityAmount })

}

exports.submitConfirmAmount = async function (req, res) {
    var errors = confirmAmountValidator.validateConfirmAmountDetails(errors, req);

    if (errors && errors.sortCode || errors.bankAcc) {
        console.log('err');
        return res.json({ errors: errors });
    }
    else {
        var account = req.user;

        var school = await schoolUtility.getSchoolFromAccountId(account.id); 
        await schoolUtility.confirmCharityAmountBySchoolId(school.id);

        await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES_ID.CONFIRMED_CHARITABLE_CONTRIBUTION);

        await queueController.addSendConfirmationDetailEmailJob(school.id, req.body.name, req.body.bankAcc,
            req.body.sortCode, req.body.type);

        return res.json({ success: 'success' });
    }
}

exports.getGiveBackDetailsScreen = async function (req, res) {
    var schoolNumber = req.query.schoolNumber;
    var school = await schoolUtility.getSchoolFromSchoolNumber(schoolNumber);


    if (school == null)
        return res.redirect('/give_back');

    var giveBackAmountBreakDownPerClass = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
    var classes = giveBackAmountBreakDownPerClass.classesData;
    var totalGiveBackAmount = giveBackAmountBreakDownPerClass.totalGiveBackAmount;
    var backgroundSetting = await adminUtility.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await orderUtility.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolUtility.getSchoolsRequiringGiveBackAction();
    var charityAmount = await schoolUtility.getCharityAmount(school.id); 

    var schoolRequiresAction = schoolsRequiringGiveBackAction.filter(o => o.schoolFk == school.id);
    res.render('giveBackDetails', {
        user: req.user, school: school, classes: classes, totalGiveBackAmount: totalGiveBackAmount,
        backgroundSetting: backgroundSetting, ordersNotShipped: ordersNotShipped, schoolRequiresAction: schoolRequiresAction.length > 0,
        schoolsRequiringGiveBackAction: schoolsRequiringGiveBackAction, charityAmount: charityAmount
    })
}
