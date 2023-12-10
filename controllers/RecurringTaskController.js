const nodeSchedule = require('node-schedule');
const queueController = require('./QueueController');

async function charityAmountBackTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 5;
  rule.minute = 45;
  // rule.second = 20;
  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('charity');
    console.log('charity amount back recurring task starting');
  });
}

async function sendCharityAmountConfirmedSendToSchoolReminder() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 7;
  rule.minute = 15;
  // rule.second = 20;
  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('charityAmountConfirmed');
    console.log('charity amount confirmed recurring task starting');
  });
}

async function noDeadlineResponseTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 12;
  rule.minute = 19;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('noDeadlineResponse');
    console.log('No deadline response recurring task starting');
  });
}

async function parent3DaysToDeadline() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 10;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('parent3DaysToDeadline');
    console.log('Parent 3 Days To Deadline recurring task starting');
  });
}

async function parent1DaysToDeadline() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 7;
  rule.minute = 30;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('parent1DayToDeadline');
    console.log('Parent 1 Day To Deadline recurring task starting');
  });
}

async function sendNoPurchaseMadeSinceSignUp() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 8;
  rule.minute = 0;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('noPurchaseMadeSinceSignUp');
    console.log('No Purchase Made Since Sign Up recurring task starting');
  });
}

async function sendOrdersNotShippedReminder() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 6;
  rule.minute = 30;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('ordersNotShippedReminder');
    console.log('Orders Not Shipped recurring task starting');
  });
}

async function deadlineRecurringTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 3;
  rule.minute = 3;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('deadline');
    console.log('Deadline recurring task starting');
  });
}

async function delayRecurringTask() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 5;
  rule.minute = 30;
  // rule.second = 30;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('delay');
    console.log('Delay recurring task starting');
  });
}

async function sendSchoolArtworkPacksNotSentReminder() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 6;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('schoolArtworkPacksNotSentReminder');
    console.log('School Artwork Packs Not Sent Reminder recurring task starting');
  });
}

async function sendSchoolReadyForPrintingReminder() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 11;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async () => {
    await queueController.addJob('schoolReadyForPrintingReminder');
    console.log('School Ready For Printing Reminder recurring task starting');
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
