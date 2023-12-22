const express = require('express');

const notProduction = process.env.NODE_ENV !== 'production';
if (notProduction) {
  require('dotenv').config();
}
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const logger = require('pino')();
const passport = require('passport');

const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const upload = require('express-fileupload');
const flash = require('connect-flash');
require('./passport_setup')(passport);
const bodyParser = require('body-parser');
const indexRouter = require('./routes/index');

const app = express();

const models = require('./models');
const dadController = require('./controllers/DadController');
const recurringTaskController = require('./controllers/RecurringTaskController');

models.sequelize.sync().then(() => {
  logger.info('Database reece has connected successfully for Dads Christmas Card app');
  // dadController.deadlineRecurringTask().then(()=>{

  //   logger.info('Initialising recurring task which will check whether a schools deadline has passed, and to send necessary emails ' +
  //   ' aswell as move the school to waiting step');

  recurringTaskController.charityAmountBackTask().then(() => {
    logger.info('Initialising charity amount back task');

    recurringTaskController.noDeadlineResponseTask().then(() => {
      logger.info('Initialising no response to deadline email task');

      recurringTaskController.parent3DaysToDeadline().then(() => {
        logger.info('Initialising parent 3 Days To Deadline email task');

        recurringTaskController.parent1DaysToDeadline().then(() => {
          logger.info('Initialising parent 1 Days To Deadline email task');

          recurringTaskController.sendNoPurchaseMadeSinceSignUp().then(() => {
            logger.info('Initialising send No Purchase Made Since Sign Up email task');

            dadController.sendFailedEmails().then(() => {
              logger.info('Initialising send Failed email task');

              recurringTaskController.sendOrdersNotShippedReminder().then(() => {
                logger.info('Orders Not Shipped Reminder email task');

                recurringTaskController.deadlineRecurringTask().then(() => {
                  logger.info('Initialising recurring task which will check whether a schools deadline has passed, and to send necessary emails '
                        + ' aswell as move the school to waiting step');

                  recurringTaskController.delayRecurringTask().then(() => {
                    logger.info('Initialising recurring task which will move delayed schools to printing and send email');

                    recurringTaskController.sendSchoolArtworkPacksNotSentReminder().then(() => {
                      logger.info('Initialising recurring task which will send email to remind artwork pack sent out');

                      recurringTaskController.sendSchoolReadyForPrintingReminder().then(() => {
                        logger.info('Initialising recurring task which will send email to remind printing for school sent out');

                        recurringTaskController.sendCharityAmountConfirmedSendToSchoolReminder().then(() => {
                          logger.info('Initialising recurring task which will send email to remind give back amount for school sent out');
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  // need a recurring task to check all schools who have had the status at out for delivery for 2 days or more and sent email hasnt been set
  // send email to organiser detailing the amount to be sent back
  // agree button taken to page where they enter bank details and email sent to bluwave
  // disagree, stays at current step and tells them to contact bluwave etc
  // });
// });
}).catch((err) => {
  logger.error(err, 'Database connection to reece has failed!');
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(morgan('dev'));
app.use(upload());
// app.use(express.json());
app.use(bodyParser.json({
  verify(req, res, buf) {
    const url = req.originalUrl;
    if (url.startsWith('/stripe')) {
      req.rawBody = buf.toString();
    }
  },
}));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// this order is important
app.use(session(
  {
    secret: 'our new secret',
    saveUninitialized: false,
    resave: false,
    store: new MemoryStore({ checkPeriod: 86400000 }),
  },
));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use('/', indexRouter);

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//     next(createError(404));
//   });

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  logger.error(err);
  return req.app.get('env') === 'development' ? res.render('error') : res.render('404', { user: req.user });
});

module.exports = app;
