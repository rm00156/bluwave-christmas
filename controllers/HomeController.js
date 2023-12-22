const basketUtility = require('../utility/basket/basketUtility');
const kidUtility = require('../utility/kid/kidUtility');

function login(req, res) {
  const { reset } = req.query;
  const confirm = req.query.confirmAmount;

  if (reset === 'success') res.render('home4', { user: req.user, reset: true, confirm });
  else res.render('home4', { user: req.user, confirm });
}

async function home(req, res) {
  res.render('home5');
}

async function terms(req, res) {
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
}

async function privacy(req, res) {
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
}

async function about(req, res) {
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
}

async function faqs(req, res) {
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
}

module.exports = {
  about,
  faqs,
  home,
  login,
  privacy,
  terms,
};
