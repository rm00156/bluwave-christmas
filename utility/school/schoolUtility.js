const generalUtility = require('../general/generalUtility');
const models = require('../../models');
const { STATUS_TYPES, STATUS_TYPES_ID } = require('./statusTypes');
const accountUtility = require('../account/accountUtility');
const classUtility = require('../class/classUtility');
const orderUtility = require('../order/orderUtility');
const { PURCHASE_BASKET_STATUS } = require('../basket/purchaseBasketStatus');

async function generateClassNumber() {
  const classNumber = generalUtility.makeCode();

  return models.class
    .findOne({
      where: {
        classNumber,
      },
    })
    .then((schoolClass) => {
      if (schoolClass == null) return classNumber;

      return generateClassNumber();
    });
}

async function createClass(className, schoolId, yearId) {
  const classNumber = await generateClassNumber();

  return models.class.create({
    classNumber,
    name: className,
    schoolFk: schoolId,
    yearFk: yearId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getClassByNumber(number) {
  return models.class.findOne({
    where: {
      classNumber: number,
    },
  });
}

async function deleteClass(id) {
  await models.class.update(
    {
      deleteFl: true,
    },
    {
      where: {
        id,
      },
    },
  );
}

async function updateSchoolById(
  schoolId,
  schoolName,
  address,
  postCode,
  number,
  additionalInfo,
  numberOfKidsPerClass,
) {
  await models.school.update(
    {
      name: schoolName,
      address,
      postCode,
      number,
      additionalInfo,
      numberOfKidsPerClass,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: schoolId,
      },
    },
  );
}

async function createSchool(
  schoolName,
  schoolNumber,
  address,
  postCode,
  number,
  email,
  additionalInfo,
  numberOfKidsPerClass,
  organiserAccountId,
) {
  return models.school.create({
    name: schoolName,
    schoolNumber,
    address,
    postCode,
    number,
    email,
    additionalInfo,
    numberOfKidsPerClass,
    organiserAccountFk: organiserAccountId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getSchoolFromSchoolId(schoolId) {
  return models.school.findOne({
    where: {
      id: schoolId,
      deleteFl: false,
    },
  });
}

async function getSchoolFromAccountId(accountId) {
  return models.school.findOne({
    where: {
      organiserAccountFk: accountId,
      deleteFl: false,
    },
  });
}

async function getClassesForSchoolId(schoolId) {
  return models.class.findAll({
    where: {
      schoolFk: schoolId,
      deleteFl: false,
    },
  });
}

async function isValidClassForSchool(schoolId, className) {
  const schoolClass = await models.class.findOne({
    where: {
      name: className,
      schoolFk: schoolId,
      deleteFl: false,
    },
  });

  return schoolClass == null;
}

async function getSchoolFromClassId(classId) {
  const result = await models.sequelize.query(
    'select s.* from schools s '
      + ' inner join classes c on c.schoolFk = s.id '
      + ' where c.id = :classId ',
    { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
  );
  return result.length === 0 ? null : result[0];
}

async function getSchoolDeadlineBySchoolId(schoolId) {
  return models.deadLine.findOne({
    where: {
      schoolFk: schoolId,
    },
  });
}

async function createDeadlineForSchoolId(
  schoolId,
  deadLineDttm,
  verificationCode,
) {
  return models.deadLine.create({
    schoolFk: schoolId,
    deadLineDttm,
    continueFl: false,
    delayFl: false,
    emailSentFl: false,
    verificationCode,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getSchoolDeadlineByVerificationCode(verificationCode) {
  return models.deadLine.findOne({
    where: {
      verificationCode,
    },
  });
}

async function createVerificationCodeForDeadline() {
  const code = generalUtility.makeCode();

  const deadline = await getSchoolDeadlineByVerificationCode(code);

  if (deadline == null) return code;

  return createVerificationCodeForDeadline();
}

async function getNumberOfKidsLinkedToEachSchool() {
  return models.sequelize.query(
    'select distinct s.name, s.schoolNumber, count(k.id) as totalKids from kids k '
      + ' inner join classes c on k.classFk = c.id '
      + ' inner join schools s on c.schoolFk = s.id '
      + ' group by s.name, s.schoolNumber having count(k.id) > 0 ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function createNewStatusForSchoolId(schoolId, statusTypeId) {
  return models.status.create({
    statusTypeFk: statusTypeId,
    schoolFk: schoolId,
    createdDttm: Date.now(),
    versionNo: 1,
    deleteFl: false,
  });
}

async function changeSchoolToPrintStatus(schoolId, organiser) {
  await createNewStatusForSchoolId(schoolId, 7);

  if (organiser === true) {
    await models.deadLine.update(
      {
        continueFl: true,
      },
      {
        where: { schoolFk: schoolId },
      },
    );
  }
}

async function getSchoolStatusByStatusTypeId(schoolId, statusTypeId) {
  return models.status.findOne({
    where: {
      statusTypeFk: statusTypeId,
      schoolFk: schoolId,
    },
    order: [['createdDttm', 'DESC']],
  });
}

async function getAllStatusTypes() {
  return models.statusType.findAll({
    where: {
      deleteFl: false,
    },
    order: [['id', 'ASC']],
  });
}

function getDeadlineDetails(deadLine) {
  let deadLineDttm = '';
  let daysLeft;
  let daysLeftSign;
  const now = Date.now();
  if (deadLine != null) {
    const unparsedDeadLine = deadLine.deadLineDttm;

    let month = unparsedDeadLine.getMonth() + 1;
    month = month < 10 ? `0${month}` : month;
    let days = unparsedDeadLine.getDate();
    days = days < 10 ? `0${days}` : days;
    const years = unparsedDeadLine.getFullYear();

    deadLineDttm = `${years}-${month}-${days}`;

    const unparsedDeadlineTime = unparsedDeadLine.getTime();
    daysLeft = unparsedDeadlineTime - now;
    daysLeft /= 1000 * 60 * 60 * 24;

    if (daysLeft < 0) {
      daysLeft = Math.ceil(daysLeft);
      if (daysLeft === 0) daysLeftSign = 'zero';
      else daysLeftSign = 'negative';
    } else if (daysLeft === 0) {
      daysLeftSign = 'zero';
    } else {
      daysLeft = Math.ceil(daysLeft);
      if (daysLeft === 0) daysLeftSign = 'zero';
      else daysLeftSign = 'postive';
    }
  }

  return { deadLineDttm, daysLeft, daysLeftSign };
}

async function getDeadlineDetailsForSchoolId(schoolId) {
  const deadLine = await getSchoolDeadlineBySchoolId(schoolId);
  return getDeadlineDetails(deadLine);
}

async function getCurrentSchoolsStatusDetailsBySchoolId(schoolId) {
  let query = 'select s.id as schoolId, s.schoolNumber,s.name, st.id as statusId, stt.id as statusTypeId, stt.type as currentStep, stt.nextTypeFk from schools s '
    + ' inner join statuses st on st.schoolFk = s.id '
    + ' inner join statusTypes stt on st.statusTypeFk = stt.id '
    + ' where st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc limit 1 ) ';

  if (schoolId !== null && schoolId !== undefined) query = `${query} and s.id = :schoolId`;

  return models.sequelize.query(query, {
    replacements: { schoolId },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function createStatusType(id, type, nextTypeId) {
  return models.statusType.create({
    id,
    type,
    nextTypeFk: nextTypeId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getSchoolsRequiringGiveBackAction(schoolId) {
  // for each school find school where charityamount has been confirmed and
  // still on step 11 Confirmed Charitable Contribution

  const currentSchoolsStatusDetails = await getCurrentSchoolsStatusDetailsBySchoolId(schoolId);

  if (currentSchoolsStatusDetails.length === 0) return currentSchoolsStatusDetails;

  const schoolIds = [];

  currentSchoolsStatusDetails.forEach((item) => {
    if (item.statusTypeId === STATUS_TYPES_ID.CONFIRMED_CHARITABLE_CONTRIBUTION) schoolIds.push(item.schoolId);
  });

  if (schoolIds.length === 0) return [];

  return models.sequelize.query(
    'select s.name, c.* from charityAmounts c'
      + ' inner join schools s on c.schoolFk = s.id '
      + ' where c.confirmedFl = true '
      + ' and schoolFk in (:schoolIds) ',
    { replacements: { schoolIds }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function createCharityAmount(schoolId, amount) {
  return models.charityAmount.create({
    schoolFk: schoolId,
    amount,
    confirmedFl: false,
    createdDttm: Date.now(),
    deleteFl: false,
    versionNo: 1,
  });
}

async function getCharityAmount(schoolId) {
  return models.charityAmount.findOne({
    where: {
      schoolFk: schoolId,
    },
  });
}

async function getStatusTypeById(statusTypeId) {
  return models.statusType.findOne({
    where: {
      id: statusTypeId,
    },
  });
}

async function getNextStepsForStatusType(nextTypeId, currentStatusTypeId) {
  const nextSteps = [];
  if (nextTypeId == null) {
    if (currentStatusTypeId === STATUS_TYPES_ID.DELAY) {
      nextSteps.push({ id: STATUS_TYPES_ID.PRINTING, type: 'Delay' });
      nextSteps.push({
        id: STATUS_TYPES_ID.PACKING_COMPLETE,
        type: 'Printing',
      });
    }
  } else {
    const statusType = await getStatusTypeById(nextTypeId);
    nextSteps.push({ id: nextTypeId, type: statusType.type });
  }

  return nextSteps;
}

async function getAllKidsFromSchoolId(schoolId) {
  return models.sequelize.query(
    'select k.* from kids k '
      + ' inner join classes c on k.classFk = c.id '
      + ' inner join schools s on c.schoolFk = s.id '
      + ' where s.id = :schoolId '
      + ' and k.deleteFl = false ',
    { replacements: { schoolId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getSchoolFromSchoolNumber(schoolNumber) {
  return models.school.findOne({
    where: {
      schoolNumber,
      deleteFl: false,
    },
  });
}

async function getOrderDetailsForAllKidsFromSchoolId(schoolId) {
  const totalKidsArray = await getAllKidsFromSchoolId(schoolId);
  const totalKids = totalKidsArray.length;

  return models.sequelize
    .query(
      'select count(distinct pb.id) as orderCount from purchaseBaskets pb '
        + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
        + ' inner join productItems pi on b.productItemFk = pi.id '
        + ' inner join classes c on pi.classFk = c.id '
        + ' inner join schools s on c.schoolFk = s.id '
        + ' where s.id = :schoolId '
        + ' and pb.status = :completed ',
      {
        replacements: { schoolId, completed: PURCHASE_BASKET_STATUS.COMPLETED },
        type: models.sequelize.QueryTypes.SELECT,
      },
    )
    .then((orders) => {
      const details = {
        orderCount: orders[0].orderCount,
        totalKids,
      };

      return details;
    });
}

async function resetCharityAmount(amount, charityAmountId) {
  await models.charityAmount.update(
    {
      amount,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: charityAmountId,
      },
    },
  );
}

async function confirmCharityAmountBySchoolId(schoolId) {
  await models.charityAmount.update(
    {
      confirmedFl: true,
      confirmedDttm: Date.now(),
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        schoolFk: schoolId,
      },
    },
  );
}

async function getAllSchools() {
  return models.school.findAll({
    where: {
      deleteFl: false,
    },
  });
}

async function getNumberOfSchools() {
  const schools = await getAllSchools();

  return schools.length;
}

async function getSchoolFromBasketItemId(basketItemId) {
  const result = await models.sequelize.query(
    'select distinct s.* from basketItems b '
      + ' inner join kids k on k.parentAccountFk = b.accountFk '
      + ' inner join classes c on k.classFk = c.id '
      + ' inner join schools s on c.schoolFk = s.id '
      + ' where b.id = :basketItemId ',
    { replacements: { basketItemId }, type: models.sequelize.QueryTypes.SELECT },
  );

  return result[0];
}

async function getSchoolDeadlineFromClassId(classId) {
  const result = await models.sequelize.query(
    'select d.* from schools s '
      + ' inner join classes c on c.schoolFk = s.id '
      + ' inner join deadLines d on d.schoolFk = s.id '
      + ' where c.id = :classId ',
    { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
  );
  return result.length === 0 ? null : result[0];
}

async function getClassesWithOrdersBySchoolId(schoolId) {
  return models.sequelize.query(
    'select distinct c.* from basketItems b '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' inner join productItems pi on b.productItemFk = pi.id '
      + ' inner join classes c on pi.classFk = c.id '
      + ' where pb.status = :completed '
      + ' and c.schoolFk = :schoolId',
    {
      replacements: { completed: PURCHASE_BASKET_STATUS.COMPLETED, schoolId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getGiveBackAmountBreakDownPerClass(schoolId) {
  const classes = await getClassesWithOrdersBySchoolId(schoolId);

  const classesData = [];
  let totalGiveBackAmount = 0;

  for (let i = 0; i < classes.length; i += 1) {
    const schoolClass = classes[i];
    const giveBackAmountDetailsForClass = await classUtility.getGiveBackAmountDetailsForClassByClassId(
      schoolClass.id,
    );
    giveBackAmountDetailsForClass.name = schoolClass.name;

    totalGiveBackAmount += parseFloat(
      giveBackAmountDetailsForClass.giveBackTotal,
    );
    classesData.push(giveBackAmountDetailsForClass);
  }

  totalGiveBackAmount = totalGiveBackAmount.toFixed(2);

  return { classesData, totalGiveBackAmount };
}

async function delayDeadlineForSchoolId(schoolId) {
  await models.deadLine.update(
    {
      continueFl: false,
      delayFl: true,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: { schoolFk: schoolId },
    },
  );
}

async function hasSchoolStartedPrintingOrBeenDelayed(schoolId) {
  const result = await models.sequelize.query(
    'select * from statuses s '
      + ' inner join schools sch on s.schoolFk = sch.id '
      + ' inner join statusTypes st on s.statusTypeFk = st.id '
      + ' where sch.id = :schoolId '
      + ' and ( st.type = :printing  or st.type = :delay) ',
    {
      replacements: {
        schoolId,
        printing: STATUS_TYPES.PRINTING,
        delay: STATUS_TYPES.DELAY,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
  return result.length > 0;
}

async function resetDeadlineDttmForSchoolId(schoolId, deadLineDttm) {
  await models.deadLine.update(
    {
      deadLineDttm,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        schoolFk: schoolId,
      },
    },
  );
}

async function getAllDeadlines() {
  return models.sequelize.query(
    'select CAST(d.deadLineDttm AS DATE) as deadLine, s.name, s.schoolNumber, d.delayFl from deadLines d '
      + ' inner join schools s on d.schoolFk = s.id ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getAllOrderItemDetailsForSchoolId(schoolId) {
  let query = 'select distinct b.id, pv.name, pt.type, b.quantity as quantity, b.cost from classes c '
    + ' inner join schools s on c.schoolFk = s.id '
    + ' inner join productItems pi on pi.classFk = c.id '
    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
    + ' inner join products p on pv.productFk = p.id '
    + ' inner join productTypes pt on p.productTypeFk = pt.id '
    + ' inner join basketItems b on b.productItemFk = pi.id '
    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
    + ' where pb.status = :completed ';

  if (schoolId) query += ' and s.id = :schoolId ';

  return models.sequelize.query(query, {
    replacements: { schoolId, completed: PURCHASE_BASKET_STATUS.COMPLETED },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getAllOrderItemsLinkedIndirectlyToSchoolId(schoolId) {
  let query = 'select distinct b.id, pv.name, pt.type, b.quantity as quantity, b.cost from schools s '
    + ' inner join classes c on c.schoolFk = s.id '
    + ' inner join kids k on k.classFk = c.id '
    + ' inner join basketItems b on b.accountFk = k.parentAccountFk '
    + ' inner join productItems pi on b.productItemFk = pi.id '
    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
    + ' inner join products p on pv.productFk = p.id '
    + ' inner join productTypes pt on p.productTypeFk = pt.id '
    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
    + ' inner join kids k2 on pi.kidFk = k2.id '
    + ' where k2.classFk is null '
    + ' and pb.status = :completed ';

  if (schoolId) query = `${query} and s.id = :schoolId `;

  return models.sequelize.query(query, {
    replacements: { schoolId, completed: PURCHASE_BASKET_STATUS.COMPLETED },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getGiveBackAmount(schoolId) {
  // orders linked to a class

  // all orders which are linked to a school
  const orderItemDetailsForSchool = await getAllOrderItemDetailsForSchoolId(
    schoolId,
  );
  // find all orders which are linked to a school indirectly
  // make the results the same as class ie include cost and type

  const orderItemsDetailsLinkedIndirectlyToSchool = await getAllOrderItemsLinkedIndirectlyToSchoolId(schoolId);

  const orderItemDetails = [
    ...orderItemDetailsForSchool,
    ...orderItemsDetailsLinkedIndirectlyToSchool,
  ];
  return orderUtility.getGiveBackAmountDetailsFromOrderDetails(
    orderItemDetails,
  );
}

async function getGiveBackAmountDetailsForEachSchool() {
  const schools = await getAllSchools();
  const result = [];
  for (let i = 0; i < schools.length; i += 1) {
    const school = schools[i];

    const giveBackAmounts = await getGiveBackAmount(school.id);
    giveBackAmounts.school = school.name;
    giveBackAmounts.schoolNumber = school.schoolNumber;
    const requiresAction = await getSchoolsRequiringGiveBackAction(school.id);
    giveBackAmounts.action = requiresAction.length > 0;
    result.push(giveBackAmounts);
  }

  return result;
}

async function getSchoolProgressDetails() {
  const result = await models.sequelize.query(
    'select s.name, s.schoolNumber, (st.statusTypeFk/13)*100 as percentage from schools s '
      + ' inner join statuses st on st.schoolFk = s.id '
      + ' where st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc limit 1) '
      + ' order by percentage desc',
    { type: models.sequelize.QueryTypes.SELECT },
  );

  return result;
}

async function getSchoolsWithCurrentStatusComplete() {
  return models.sequelize.query(
    'select s.* from schools s '
      + ' inner join statuses st on st.schoolFk = s.id '
      + ' where st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc limit 1) '
      + ' and st.statusTypeFk = :complete ',
    {
      replacements: { complete: STATUS_TYPES_ID.COMPLETE },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getSchoolDashboardStatus() {
  // extract this query to its own method
  // get schools who have status set to completed
  const schoolsWithCurrentStatusComplete = await getSchoolsWithCurrentStatusComplete();
  const numberOfCompleted = schoolsWithCurrentStatusComplete.length;

  const numberOfSchools = await getNumberOfSchools();
  const numberOfCompletedPercentage = (numberOfCompleted / numberOfSchools) * 100;
  const numberOfNonCompleted = numberOfSchools - numberOfCompleted;
  const numberOfNonCompletedPercentage = 100 - numberOfCompletedPercentage;

  return {
    numberOfCompleted,
    numberOfNonCompleted,
    numberOfCompletedPercentage: numberOfCompletedPercentage.toFixed(0),
    numberOfNonCompletedPercentage: numberOfNonCompletedPercentage.toFixed(0),
  };
}

async function searchForSchoolByNameAddressPostCodeStatusAndEmail(
  name,
  address,
  postCode,
  status,
  email,
) {
  return models.sequelize.query(
    'select s.*, stp.type, a.created_at as school_createdDt from schools s'
      + ' inner join statuses st on st.schoolFk = s.id '
      + ' inner join statusTypes stp on st.statusTypeFk = stp.id '
      + ' inner join accounts a on s.organiserAccountFk = a.id '
      + ' where s.name like :name '
      + ' and s.address like :address '
      + ' and s.postCode like :postCode '
      + ' and stp.type like :status '
      + ' and s.email like :email '
      + ' and st.id = (select id from statuses where schoolFk = s.id order by createdDttm desc limit 1)',
    {
      replacements: {
        name: `%${name}%`,
        address: `%${address}%`,
        postCode: `%${postCode}%`,
        status: `%${status}%`,
        email: `%${email}%`,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getSchoolDetailsBySchoolNumber(schoolNumber) {
  const schoolDetails = await models.sequelize.query(
    'select s.*, a.email, a.accountNumber, sts.type, sts.id as typeId, sts.nextTypeFk  from schools s '
      + ' inner join statuses st on st.schoolFk = s.id '
      + ' inner join statusTypes sts on st.statusTypeFk = sts.id '
      + ' inner join accounts a on s.organiserAccountFk = a.id '
      + ' where s.schoolNumber = :schoolNumber '
      + ' order by st.createdDttm desc, st.statusTypeFk desc LIMIT 1',
    {
      replacements: {
        schoolNumber,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  return schoolDetails.length === 0 ? null : schoolDetails[0];
}

async function getStatusTypeDetailsForSchoolId(schoolId) {
  const statusTypes = await getAllStatusTypes();

  const statusTypeDetails = [];

  for (let i = 0; i < statusTypes.length; i += 1) {
    const statusType = statusTypes[i];
    const status = await getSchoolStatusByStatusTypeId(schoolId, statusType.id);
    const statusTypeDetail = {
      statusType: statusType.type,
      createdDttm: status ? status.createdDttm : null,
      reached: !!status,
    };

    statusTypeDetails.push(statusTypeDetail);
  }

  const reachedStatuses = statusTypeDetails.filter((o) => o.reached);
  const reachedStatusCount = reachedStatuses.length;

  return {
    statusTypeDetails,
    reachedStatusCount,
  };
}

async function generateSchoolNumber() {
  const schoolNumber = generalUtility.makeCode();
  const school = await getSchoolFromSchoolNumber(schoolNumber);

  if (school == null) return schoolNumber;

  return generateSchoolNumber(school);
}

// add unit test
async function updateSchoolDetailsForSchoolId(
  schoolId,
  schoolName,
  address,
  postCode,
  number,
  organiserName,
  additionalInfo,
  numberOfKidsPerClass,
) {
  await updateSchoolById(
    schoolId,
    schoolName,
    address,
    postCode,
    number,
    additionalInfo,
    numberOfKidsPerClass,
  );

  const school = await getSchoolFromSchoolId(schoolId);

  await accountUtility.updateAccountNameAndNumber(
    school.organiserAccountFk,
    organiserName,
    number,
  );
}

module.exports = {
  createClass,
  createSchool,
  createDeadlineForSchoolId,
  createVerificationCodeForDeadline,
  getClassByNumber,
  generateClassNumber,
  deleteClass,
  updateSchoolById,
  getSchoolFromSchoolId,
  getSchoolDeadlineByVerificationCode,
  getSchoolFromAccountId,
  getClassesForSchoolId,
  isValidClassForSchool,
  getSchoolFromClassId,
  getSchoolDeadlineBySchoolId,
  getNumberOfKidsLinkedToEachSchool,
  createNewStatusForSchoolId,
  changeSchoolToPrintStatus,
  getSchoolStatusByStatusTypeId,
  getAllStatusTypes,
  getDeadlineDetailsForSchoolId,
  getDeadlineDetails,
  getCurrentSchoolsStatusDetailsBySchoolId,
  createStatusType,
  getSchoolsRequiringGiveBackAction,
  createCharityAmount,
  getCharityAmount,
  getNextStepsForStatusType,
  getStatusTypeById,
  getAllKidsFromSchoolId,
  getSchoolFromSchoolNumber,
  getOrderDetailsForAllKidsFromSchoolId,
  resetCharityAmount,
  confirmCharityAmountBySchoolId,
  getNumberOfSchools,
  getSchoolFromBasketItemId,
  getSchoolDeadlineFromClassId,
  getGiveBackAmountBreakDownPerClass,
  getClassesWithOrdersBySchoolId,
  delayDeadlineForSchoolId,
  hasSchoolStartedPrintingOrBeenDelayed,
  resetDeadlineDttmForSchoolId,
  getAllDeadlines,
  getGiveBackAmountDetailsForEachSchool,
  getAllOrderItemDetailsForSchoolId,
  getAllOrderItemsLinkedIndirectlyToSchoolId,
  getGiveBackAmount,
  getSchoolProgressDetails,
  getSchoolDashboardStatus,
  getSchoolsWithCurrentStatusComplete,
  searchForSchoolByNameAddressPostCodeStatusAndEmail,
  getSchoolDetailsBySchoolNumber,
  getStatusTypeDetailsForSchoolId,
  generateSchoolNumber,
  getAllSchools,
  updateSchoolDetailsForSchoolId,
};
