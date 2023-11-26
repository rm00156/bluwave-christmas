const nodeSchedule = require('node-schedule');
const queueController = require('../controllers/QueueController');

exports.charityAmountBackTask = async function()
{
    var rule = new nodeSchedule.RecurrenceRule();
    rule.hour = 5;
    rule.minute = 45;
    // rule.second = 20;
    return nodeSchedule.scheduleJob(rule, async function(){

      await queueController.addJob('charity');
      console.log('charity amount back recurring task starting');

    });
}

exports.sendCharityAmountConfirmedSendToSchoolReminder = async function()
{
  var rule = new nodeSchedule.RecurrenceRule();
    rule.hour = 7;
    rule.minute = 15;
    // rule.second = 20;
    return nodeSchedule.scheduleJob(rule, async function(){

      await queueController.addJob('charityAmountConfirmed');
      console.log('charity amount confirmed recurring task starting');

    });
}


exports.noDeadlineResponseTask = async function()
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour =12;
  rule.minute = 19;

  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('noDeadlineResponse');
    console.log('No deadline response recurring task starting');

  });
}

exports.parent3DaysToDeadline = async function(req,res)
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 10;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('parent3DaysToDeadline');
    console.log('Parent 3 Days To Deadline recurring task starting');

  });
}

exports.parent1DaysToDeadline = async function(req,res)
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour =7;
  rule.minute = 30;

  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('parent1DayToDeadline');
    console.log('Parent 1 Day To Deadline recurring task starting');

  });
}


exports.sendNoPurchaseMadeSinceSignUp = async function(req,res)
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour =8;
  rule.minute = 0;

  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('noPurchaseMadeSinceSignUp');
    console.log('No Purchase Made Since Sign Up recurring task starting');

  });
}

exports.sendOrdersNotShippedReminder = async function(req,res)
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 6;
  rule.minute = 30;

  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('ordersNotShippedReminder');
    console.log('Orders Not Shipped recurring task starting');

  });
}

exports.deadlineRecurringTask = async function(req,res)
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour =3;
  rule.minute = 3;

  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('deadline');
    console.log('Deadline recurring task starting');
  });
}

exports.delayRecurringTask = async function(req,res)
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour =5;
  rule.minute = 30;
  // rule.second = 30;
;
  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('delay');
    console.log('Delay recurring task starting');

  });
}

exports.sendSchoolArtworkPacksNotSentReminder = async function(req,res)
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 6;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('schoolArtworkPacksNotSentReminder');
    console.log('School Artwork Packs Not Sent Reminder recurring task starting');

  });
}

exports.sendSchoolReadyForPrintingReminder = async function(req,res)
{
  var rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 11;
  rule.minute = 35;

  return nodeSchedule.scheduleJob(rule, async function(){

    await queueController.addJob('schoolReadyForPrintingReminder');
    console.log('School Ready For Printing Reminder recurring task starting');

  });
}
