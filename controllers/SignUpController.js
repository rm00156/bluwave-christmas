const passport = require('passport');
const { isEmpty } = require('lodash');
const fetch = require('node-fetch');
const { stringify } = require('querystring');
const models = require('../models');
const {
  validateUser,
  validateOrganiserSignup,
} = require('../validators/signup');
const queueController = require('./QueueController');

const dashboardController = require('./DashboardController');
const schoolUtility = require('../utility/school/schoolUtility');
const generalUtility = require('../utility/general/generalUtility');
const accountUtility = require('../utility/account/accountUtility');
const STATUS_TYPES = require('../utility/school/statusTypes');

async function processCaptcha(req, res) {
  const { captcha } = req.body;
  if (!captcha) {
    return res.json({ error: 'Token not defined' });
  }

  const query = stringify({
    secret: process.env.captcha_secret_key,
    response: req.body.captcha,
    remoteip: req.connection.remoteAddress,
  });
  const verifyURL = `https://google.com/recaptcha/api/siteverify?${query}`;

  const body = await fetch(verifyURL).then((response) => response.json());

  if (!body.success || body.score < 0.4) {
    return res.json({
      error: 'You might be a robot, sorry!! You are banned!',
      score: body.score,
    });
  }

  return res.json({});
}

async function rerenderSignup(errors, req, res, type) {
  if (req.path === '/signupOrganiser') {
    console.log(errors);
    res.render('signupOrganiser3', { formData: req.body, errors });
  } else if (req.path === '/signup') {
    res.render('signup3', { formData: req.body, errors, type });
  } else {
    res.render('signUpAdmin', { formData: req.body, errors, user: req.user });
  }
}

async function signup(req, res, next) {
  return validateUser(req).then(async (validateUserErrors) => {
    const { type, name, telephoneNo } = req.body;
    if (!isEmpty(validateUserErrors)) {
      // reRender the sign up page with the errors
      rerenderSignup(validateUserErrors, req, res, type);
    } else {
      const accountTypeFk = 2;

      const transaction = await models.sequelize.transaction();
      const accountNumber = await accountUtility.getNewAccountCode();

      const accountDetail = {
        accountNumber,
        email: req.body.email,
        hashPassword: generalUtility.generateHash(req.body.password),
        name,
        accountTypeId: accountTypeFk,
        telephoneNumber: telephoneNo,
        defaultPassword: false,
      };
      try {
        await accountUtility.createAccount(accountDetail);
      } catch (err) {
        // throw exception
        await transaction.rollback();
        throw new Error('error with account sign up');
      }

      await transaction.commit();

      await queueController.addParentRegistrationEmailJob(req.body.email);
      await queueController.addParentRegistrationBluwaveEmailJob(
        req.body.email,
        telephoneNo,
        name,
      );

      // authenticate with passport
      passport.authenticate('local', {
        successRedirect: '/parentDashboard',
        failureRedirect: '/signup',
        failureFlash: true,
      })(req, res, next);
      // needs to be translated to the create your own card button
    }
  });
}

function signupOrganiser(req, res, next) {
  return validateOrganiserSignup(req).then(async (validateOrganiserErrors) => {
    if (!isEmpty(validateOrganiserErrors)) {
      // reRender the sign up page with the errors
      console.log(validateOrganiserErrors);
      rerenderSignup(validateOrganiserErrors, req, res);
    } else {
      const t = await models.sequelize.transaction();
      const accountNumber = await accountUtility.getNewAccountCode();
      try {
        const accountDetail = {
          accountNumber,
          email: req.body.email,
          hashPassword: generalUtility.generateHash(req.body.password),
          name: req.body.name,
          accountTypeId: 3,
          telephoneNumber: req.body.telephoneNo,
          defaultPassword: false,
        };
        const newAccount = await accountUtility.createAccount(accountDetail);

        const schoolNumber = await schoolUtility.generateSchoolNumber();

        const school = await schoolUtility.createSchool(
          req.body.school,
          schoolNumber,
          req.body.address,
          req.body.postCode,
          req.body.telephoneNo,
          req.body.email,
          req.body.additionalInfo,
          req.body.numberOfKidsPerClass,
          newAccount.id,
        );

        const classArray = req.body['classArray[]'];
        for (let i = 0; i < classArray.length; i += 1) {
          const index = classArray[i];
          const classValue = req.body[`class${index}`];
          await schoolUtility.createClass(classValue, school.id, 31);
        }

        await schoolUtility.createNewStatusForSchoolId(
          school.id,
          STATUS_TYPES.STATUS_TYPES_ID.REGISTERED,
        );

        const classes = await models.class.findAll({
          where: {
            schoolFk: school.id,
          },
        });
        await queueController.addOrganiserRegistrationEmailJob(
          req.body.email,
          school,
          req.body.name,
        );
        await queueController.addOrganiserRegistrationBluwaveEmailJob(
          school,
          newAccount.dataValues,
          req.body.name,
          classes.length,
        );
      } catch (error) {
        console.log(error);
        await t.rollback();
        throw error;
      }

      await t.commit();

      passport.authenticate('local', {
        successRedirect: '/organiserDashboard',
        failureRedirect: '/signup_organiser',
        failureFlash: true,
      })(req, res, next);
    }
  });
}

function renderLogin(req, res) {
  res.render('home4', {
    formData: req.body,
    error: 'You have entered an invalid username or password',
  });
}

function login(req, res, next) {
  passport.authenticate('local', (err, user) => {
    if (err) return next(err);

    if (!user) return renderLogin(req, res);

    return req.logIn(user, async (loginErr) => {
      if (loginErr) {
        console.log(loginErr);
        return next(loginErr);
      }

      if (user.firstLoginFl === true) {
        await models.account.update(
          {
            firstLoginFl: false,
          },
          {
            where: {
              id: user.id,
            },
          },
        );
      }

      let dashboardPath;
      if (user.accountTypeFk === 1) {
        dashboardPath = '/adminDashboard';
      } else if (user.accountTypeFk === 2) {
        dashboardPath = '/parentDashboard';
      } else if (req.body.confirm === 'true') {
        dashboardPath = '/confirmAmount';
      } else {
        dashboardPath = '/organiserDashboard';
      }

      return res.redirect(dashboardPath);
    });
  })(req, res, next);
};

function logout(req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
};

async function signupPage(req, res) {
  // res.redirect('/');
  const { type } = req.query;
  res.render('signup3', { type, errors: {} });
};

function signupOrganiserPage(req, res) {
  // res.render('signupOrganiser3',{errors:{}});
  res.redirect('/login');
};

function signUpAdmin(req, res) {
  res.render('signUpAdmin', { errors: {}, user: req.user });
};

async function signUpAdminPage(req, res) {
  const errors = await validateUser(req);
  if (!isEmpty(errors)) {
    // reRender the sign up page with the errors
    console.log(errors);
    rerenderSignup(errors, req, res);
  } else if (req.body.name === undefined) {
    await models.account.create({
      email: req.body.email,
      password: generalUtility.generateHash(req.body.password),
      accountTypeFk: 1,
      defaultPassword: false,
      firstLoginFl: true,
      versionNo: 1,
      deleteFl: false,
    });
    dashboardController.loadScreen(req, res);
  }
}

module.exports = {
  processCaptcha,
  signup,
  signUpAdminPage,
  signupOrganiser,
  signupPage,
  signupOrganiserPage,
  login,
  logout,
  signUpAdmin
};
