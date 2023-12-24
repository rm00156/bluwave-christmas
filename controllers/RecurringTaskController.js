const nodeSchedule = require('node-schedule');
const logger = require('pino')();
const queueController = require('./QueueController');

async function charityAmountBackTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 5;
  rule.minute = 45;
  // rule.second = 20;
  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('charity');
    logger.info('charity amount back recurring task starting');
  });
}

async function sendCharityAmountConfirmedSendToSchoolReminder() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 7;
  rule.minute = 15;
  // rule.second = 20;
  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('charityAmountConfirmed');
    logger.info('charity amount confirmed recurring task starting');
  });
}

async function noDeadlineResponseTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 12;
  rule.minute = 19;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('noDeadlineResponse');
    logger.info('No deadline response recurring task starting');
  });
}

async function parent3DaysToDeadline() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 10;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('parent3DaysToDeadline');
    logger.info('Parent 3 Days To Deadline recurring task starting');
  });
}

async function parent1DaysToDeadline() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 7;
  rule.minute = 30;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('parent1DayToDeadline');
    logger.info('Parent 1 Day To Deadline recurring task starting');
  });
}

async function sendNoPurchaseMadeSinceSignUp() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 8;
  rule.minute = 0;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('noPurchaseMadeSinceSignUp');
    logger.info('No Purchase Made Since Sign Up recurring task starting');
  });
}

async function sendOrdersNotShippedReminder() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 6;
  rule.minute = 30;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('ordersNotShippedReminder');
    logger.info('Orders Not Shipped recurring task starting');
  });
}

async function deadlineRecurringTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 3;
  rule.minute = 3;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('deadline');
    logger.info('Deadline recurring task starting');
  });
}

async function delayRecurringTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 5;
  rule.minute = 30;
  // rule.second = 30;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('delay');
    logger.info('Delay recurring task starting');
  });
}

async function sendSchoolArtworkPacksNotSentReminder() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 6;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('schoolArtworkPacksNotSentReminder');
    logger.info('School Artwork Packs Not Sent Reminder recurring task starting');
  });
}

async function sendSchoolReadyForPrintingReminder() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 11;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('schoolReadyForPrintingReminder');
    logger.info('School Ready For Printing Reminder recurring task starting');
  });
}

module.exports = {
  charityAmountBackTask,
  deadlineRecurringTask,
  delayRecurringTask,
  parent3DaysToDeadline,
  parent1DaysToDeadline,
  noDeadlineResponseTask,
  sendCharityAmountConfirmedSendToSchoolReminder,
  sendNoPurchaseMadeSinceSignUp,
  sendOrdersNotShippedReminder,
  sendSchoolArtworkPacksNotSentReminder,
  sendSchoolReadyForPrintingReminder,
};
