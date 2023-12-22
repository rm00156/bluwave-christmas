const { getBackgroundSetting } = require('../utility/admin/adminUtility');
const queueController = require('./QueueController');
const { getOrdersForClassId, getOrdersNotShipped } = require('../utility/order/orderUtility');
const {
  getSchoolsRequiringGiveBackAction, getSchoolDeadlineFromClassId,
  getSchoolDeadlineBySchoolId, getClassByNumber,
} = require('../utility/school/schoolUtility');
const { getKidsFromClassId } = require('../utility/kid/kidUtility');
const {
  getOrderDetailsForAllKidsFromClassId,
  getOrderFormDetailsForClassId,
} = require('../utility/class/classUtility');

async function getClassScreen(req, res) {
  const { classNumber } = req.query;

  const schoolClass = await getClassByNumber(classNumber);
  const classId = schoolClass.id;
  const kids = await getKidsFromClassId(classId);
  const orderDetails = await getOrderDetailsForAllKidsFromClassId(
    classId,
    kids.length,
  );
  const orders = await getOrdersForClassId(classId);
  const backgroundSetting = await getBackgroundSetting(
    req.user.id,
  );
  const ordersNotShipped = await getOrdersNotShipped();
  const schoolsRequiringGiveBackAction = await getSchoolsRequiringGiveBackAction();

  res.render('adminClass', {
    user: req.user,
    schoolClass,
    backgroundSetting,
    kids,
    orderDetails,
    orders,
    ordersNotShipped,
    schoolsRequiringGiveBackAction,
  });
}

async function getClassOrderInstruction(req, res) {
  const { classId } = req.query;
  const deadline = await getSchoolDeadlineFromClassId(classId);

  if (deadline === null) return res.json({ error: 'No deadline has been set for the school' });

  const job = await queueController.addClassOrderInstructionJob(
    classId,
    deadline.id,
  );
  return res.json({ id: job.id });
}

async function getSchoolOrderInstruction(req, res) {
  const { schoolId } = req.query;
  const deadline = await getSchoolDeadlineBySchoolId(schoolId);

  if (deadline === null) return res.json({ error: 'No deadline has been set for the school' });

  const job = await queueController.addSchoolOrderInstructionJob(schoolId);
  return res.json({ id: job.id });
}

async function getCreateOrderInstructionJob(req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const instructionPath = job.returnvalue === null ? undefined : job.returnvalue.pdfPath;
    const { process } = job.data;
    res.json({
      id,
      state,
      progress,
      reason,
      instructionPath,
      process,
    });
  }
}

async function generateOrderForm(req, res) {
  const { classId } = req.body;
  const orderFormDetails = await getOrderFormDetailsForClassId(classId);
  const { cards, calendars } = orderFormDetails;

  if (cards.length === 0 && calendars.length === 0) {
    return res.json({
      error: 'No purchases to be delivered to the school have been made',
    });
  }
  const job = await queueController.addOrderFormJob(classId);
  return res.json({ id: job.id });
}

async function getPurchasedOrders(req, res) {
  const { classId } = req.body;

  const orderFormDetails = await getOrderFormDetailsForClassId(classId);
  const { cards, calendars } = orderFormDetails;

  if (cards.length === 0 && calendars.length === 0) return res.json({ error: 'No purchases have been made' });
  const job = await queueController.addPurchaseOrdersJob(classId);
  return res.json({ id: job.id });
}

module.exports = {
  generateOrderForm,
  getClassScreen,
  getClassOrderInstruction,
  getCreateOrderInstructionJob,
  getOrderDetailsForAllKidsFromClassId,
  getPurchasedOrders,
  getSchoolOrderInstruction,
};
