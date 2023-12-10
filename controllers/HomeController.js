const basketUtility = require('../utility/basket/basketUtility');
const kidUtility = require('../utility/kid/kidUtility');

exports.login = function (req, res) {
  const { reset } = req.query;
  const confirm = req.query.confirmAmount;

  if (reset === 'success') res.render('home4', { user: req.user, reset: true, confirm });
  else res.render('home4', { user: req.user, confirm });
};

exports.home = async function (req, res) {
  res.render('home5');
};

exports.terms = async function (req, res) {
  const account = req.user;
  let basketItemsDetails = null;
  let isKidsLinkedToAccount = null;
  if (account != null) {
    basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    isKidsLinkedToAccount = await kidUtility.isKidLinkedToAccountId(account.id);
  }

  res.render('terms', {
    user: account,
    basketItemsDetails,
    isKidsLinkedToAccount,
  });
};

exports.privacy = async function (req, res) {
  const account = req.user;
  let basketItemsDetails = null;
  let isKidsLinkedToAccount = null;
  if (account != null) {
    basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    isKidsLinkedToAccount = await kidUtility.isKidLinkedToAccountId(account.id);
  }

  res.render('privacy', {
    user: account,
    basketItemsDetails,
    isKidsLinkedToAccount,
  });
};

exports.about = async function (req, res) {
  const account = req.user;
  let basketItemsDetails = null;
  let isKidsLinkedToAccount = null;
  if (account != null) {
    basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    isKidsLinkedToAccount = await kidUtility.isKidLinkedToAccountId(account.id);
  }

  res.render('about', {
    user: account,
    basketItemsDetails,
    isKidsLinkedToAccount,
  });
};

exports.faqs = async function (req, res) {
  const account = req.user;
  let basketItemsDetails = null;
  let isKidsLinkedToAccount = null;
  if (account != null) {
    basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);
    isKidsLinkedToAccount = await kidUtility.isKidLinkedToAccountId(account.id);
  }

  res.render('faq', {
    user: account,
    basketItemsDetails,
    isKidsLinkedToAccount,
  });
};
