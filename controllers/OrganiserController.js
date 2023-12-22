const models = require('../models');
const schoolUtility = require('../utility/school/schoolUtility');
const basketUtility = require('../utility/basket/basketUtility');
const kidUtility = require('../utility/kid/kidUtility');
const { getOrderDetailsForAllKidsFromClassId } = require('../utility/class/classUtility');

const validator = require('../validators/signup');

async function classesScreen(req, res) {
  const accountId = req.user.id;
  const school = await schoolUtility.getSchoolFromAccountId(accountId);
  const orderDetails = await schoolUtility.getOrderDetailsForAllKidsFromSchoolId(school.id);
  const isKidLinkedToAccount = await kidUtility.isKidLinkedToAccountId(accountId);
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(accountId);
  const classes = await schoolUtility.getClassesForSchoolId(school.id);
  const statusTypeDetails = await schoolUtility.getStatusTypeDetailsForSchoolId(school.id);

  res.render('schoolParticipants3', {
    user: req.user,
    orderDetails,
    displayParentSection: isKidLinkedToAccount,
    basketItemsDetails,
    classes,
    school,
    statusTypeDetails,
  });
}

function classOrders(req, res) {
  const { classId } = req.query;

  models.class.findOne({
    where: {
      id: classId,
    },
  }).then((schoolClass) => {
    models.sequelize.query(
      'select k.* from kids k '
                                + ' inner join classes c on k.classFk = c.id '
                                + ' where c.id = :classId ',
      { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
    ).then((kids) => {
      const kidTotal = kids.length;

      models.sequelize.query(
        'select distinct k.*, kh.* from kids k '
                                    + ' inner join classes c on k.classFk = c.id '
                                    + ' inner join schools s on c.schoolFk = s.id '
                                    + ' inner join basketitems b on b.kidFk = k.id '
                                    + ' inner join kidorderhistories kh on kh.kidFk = k.id '
                                    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                    + ' where c.id = :classId '
                                    + ' and kh.accountFk = b.accountFk '
                                    + ' and pb.status = :completed ',
        { replacements: { classId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
      ).then((orderedKids) => {
        const orderedKidTotal = orderedKids.length;
        let orderedPercentage = (orderedKidTotal / kidTotal) * 100;
        orderedPercentage = Math.round(orderedPercentage * 10) / 10;
        orderedPercentage = Number.isNaN(orderedPercentage) ? 0 : orderedPercentage;

        models.kid.findOne({
          where: {
            parentAccountFk: req.user.id,
          },
        }).then((kid) => {
          models.deadLine.findOne({
            where: {
              schoolFk: schoolClass.schoolFk,
            },
          }).then((deadLine) => {
            const { deadLineDttm, daysLeft, daysLeftSign } = schoolUtility.getDeadlineDetails(deadLine);

            const displayParentSection = kid != null;
            res.render('classOrders2', {
              user: req.user,
              schoolClass,
              kidTotal,
              orderedKidTotal,
              orderedPercentage,
              orderedKids,
              displayParentSection,
              deadLineDttm,
              daysLeft,
              daysLeftSign,
            });
          });
        });
      });
    });
  });
}

function classParticipants(req, res) {
  const { classId } = req.query;
  console.log('romeo');
  models.class.findOne({
    where: {
      id: classId,
    },
  }).then((schoolClass) => {
    models.sequelize.query(
      'select k.* from kids k '
                                + ' inner join classes c on k.classFk = c.id '
                                + ' where c.id = :classId ',
      { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
    ).then((kids) => {
      const kidTotal = kids.length;

      models.sequelize.query(
        'select distinct k.*, kh.* from kids k '
                                    + ' inner join classes c on k.classFk = c.id '
                                    + ' inner join schools s on c.schoolFk = s.id '
                                    + ' inner join basketitems b on b.kidFk = k.id '
                                    + ' inner join kidorderhistories kh on kh.kidFk = k.id '
                                    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                    + ' where c.id = :classId '
                                    + ' and kh.accountFk = b.accountFk '
                                    + ' and pb.status = :completed',
        { replacements: { classId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
      ).then((orderedKids) => {
        const orderedKidTotal = orderedKids.length;
        let orderedPercentage = (orderedKidTotal / kidTotal) * 100;
        orderedPercentage = Math.round(orderedPercentage * 10) / 10;
        orderedPercentage = Number.isNaN(orderedPercentage) ? 0 : orderedPercentage;

        models.kid.findOne({
          where: {
            parentAccountFk: req.user.id,
          },
        }).then((kid) => {
          models.deadLine.findOne({
            where: {
              schoolFk: schoolClass.schoolFk,
            },
          }).then(async (deadLine) => {
            const { deadLineDttm, daysLeft, daysLeftSign } = schoolUtility.getDeadlineDetails(deadLine);

            const displayParentSection = kid != null;
            const currentStatus = await models.sequelize.query('select sts.type from classes c '
                                        + ' inner join schools s on c.schoolFk = s.id '
                                        + ' inner join statuses st on st.schoolFk = s.id '
                                        + ' inner join statusTypes sts on st.statusTypeFk = sts.id '
                                        + ' inner join statusTypes sts2 on sts.nextTypeFk = sts2.id '
                                        + ' where c.id = :classId '
                                        + ' order by st.createdDttm desc LIMIT 1', {
              replacements: {
                classId,
              },
              type: models.sequelize.QueryTypes.SELECT,
            });
            res.render('classParticipants2', {
              user: req.user,
              schoolClass,
              kidList: kids,
              kidTotal: kids.length,
              orderedKidTotal,
              orderedPercentage,
              orderedKids,
              displayParentSection,
              deadLineDttm,
              daysLeft,
              daysLeftSign,
              currentStatus: currentStatus[0].type,
            });
          });
        });
      });
    });
  });
}

async function loadOrganiserDashboard(req, res) {
  const account = req.user;
  let school = await models.sequelize.query('select s.*, a.email, a.accountNumber, sts.type, sts.id as typeId, sts.nextTypeFk  from schools s '
        + ' inner join statuses st on st.schoolFk = s.id '
        + ' inner join statusTypes sts on st.statusTypeFk = sts.id '
        + ' inner join accounts a on s.organiserAccountFk = a.id '
        + ' where a.id = :id '
        + ' order by st.createdDttm desc, st.statusTypeFk desc LIMIT 1', {
    replacements: {
      id: account.id,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
  school = school[0];

  const orderDetails = await schoolUtility.getOrderDetailsForAllKidsFromSchoolId(school.id);
  const isKidLinkedToAccount = await kidUtility.isKidLinkedToAccountId(account.id);
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
  const deadlineDetails = await schoolUtility.getDeadlineDetailsForSchoolId(school.id);
  const statusTypeDetails = await schoolUtility.getStatusTypeDetailsForSchoolId(school.id);
  const classes = await schoolUtility.getClassesForSchoolId(school.id);
  const giveBackAmount = await schoolUtility.getGiveBackAmount(school.id);
  const charityAmount = await schoolUtility.getCharityAmount(school.id);

  res.render('organiserDashboard3', {
    user: req.user,
    orderDetails,
    displayParentSection: isKidLinkedToAccount,
    basketItemsDetails,
    deadlineDetails,
    school,
    giveBackAmount,
    charityAmount,
    statusTypeDetails,
    isKidLinkedToAccount,
    numberOfClasses: classes.length,
  });
}

async function getSchoolDetailsPage(req, res) {
  const { schoolNumber } = req.query;
  const { user } = req;
  const school = await schoolUtility.getSchoolFromSchoolNumber(schoolNumber);
  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(user.id);

  res.render('schoolDetails', {
    user, school, basketItemsDetails,
  });
}

async function editSchoolDetails(req, res) {
  const { schoolId } = req.body;

  // validate values
  const errors = validator.validateOrganiserUserFields(req);

  if (errors.telephoneNo || errors.postCode || errors.address || errors.name || errors.numberOfKidsPerClass) {
    // error
    res.json({ errors });
  } else {
    await schoolUtility.updateSchoolDetailsForSchoolId(schoolId, req.body.school, req.body.address, req.body.postCode, req.body.telephoneNo, req.body.name, req.body.additionalInfo, req.body.numberOfKidsPerClass);
    res.json({ success: 'success' });
  }
}

async function getClassScreen(req, res) {
  const classNumber = req.query.number;

  const account = req.user;
  const schoolClass = await schoolUtility.getClassByNumber(classNumber);
  if (schoolClass == null) return res.redirect('/organiserDashboard');

  const school = await schoolUtility.getSchoolFromAccountId(account.id);
  const classId = schoolClass.id;

  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
  const isKidLinkedToAccount = await kidUtility.isKidLinkedToAccountId(account.id);

  const kids = await kidUtility.getKidsFromClassId(classId);
  const orderDetails = await getOrderDetailsForAllKidsFromClassId(classId, kids.length);
  const deadlineDetails = await schoolUtility.getDeadlineDetailsForSchoolId(school.id);
  const { deadLineDttm } = deadlineDetails;

  return res.render('organiserClass', {
    user: account,
    orderDetails,
    deadLineDttm,
    displayParentSection: isKidLinkedToAccount,
    basketItemsDetails,
    kids,
    school,
    schoolClass,
  });
}

module.exports = {
  classesScreen,
  classOrders,
  classParticipants,
  loadOrganiserDashboard,
  getSchoolDetailsPage,
  editSchoolDetails,
  getClassScreen,
};
