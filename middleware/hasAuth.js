const models = require('../models');

function isLoggedIn(req, res, next) {
  if (req.user) next();
  else res.redirect('/');

  // If you pass any parameter to the next function, express
  // regards the request as being an error and will skip any
  // remaining non erro-handling routing and middleware functions
}

function hasAdminAuth(req, res, next) {
  if (req.user && req.user.accountTypeFk === 1) next();
  else res.redirect('/');
}

function hasParentAuth(req, res, next) {
  if (req.user && (req.user.accountTypeFk === 2 || req.user.accountTypeFk === 3)) next();
  else res.redirect('/');
}

function hasOrganiserOrAdminAuth(req, res, next) {
  if (req.user && (req.user.accountTypeFk === 1 || req.user.accountTypeFk === 3)) next();
  else res.redirect('/');
}

function hasOrganiserAuth(req, res, next) {
  if (req.user && (req.user.accountTypeFk === 3)) next();
  else res.redirect('/');
}

function hasDefaultPasswordAuth(req, res, next) {
  if (req.user && req.user.defaultPassword === false) next();
  else res.redirect('/updatePassword');
}

async function organiserCreatedCard(req, res, next) {
  const kidId = req.query.id;

  if (req.user.accountTypeFk === 3) {
    const card = await models.card.findOne({
      where: {
        kidFk: kidId,
      },
    });

    if (card == null) {
      const classId = await models.kid.findOne({
        where: {
          id: kidId,
        },
      }).then((kid) => kid.classFk);

      return res.redirect(`/classParticipants?classId=${classId}`);
    }
  }

  return next();
}

async function redirectToDashboard(req, res, next) {
  const account = req.user;

  if (account == null) return next();

  if (account.accountTypeFk === 1) return res.redirect('/adminDashboard');
  if (account.accountTypeFk === 2) return res.redirect('/parentDashboard');
  return res.redirect('/organiserDashboard');
}

module.exports = {
  hasAdminAuth,
  hasDefaultPasswordAuth,
  hasOrganiserAuth,
  hasOrganiserOrAdminAuth,
  hasParentAuth,
  isLoggedIn,
  organiserCreatedCard,
  redirectToDashboard,
};
