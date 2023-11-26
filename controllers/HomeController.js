const basketController = require('../controllers/BasketController');
const kidController = require('../controllers/KidController');

exports.login = function(req,res)
{
  var reset = req.query.reset;
  var confirm = req.query.confirmAmount;
  
  if(reset == 'success')
    res.render('home4', {user:req.user,reset:true, confirm:confirm});
  else
    res.render('home4', {user:req.user, confirm:confirm});
}

exports.home = async function(req,res)
{
  res.render('home5');
}

exports.terms = async function(req,res)
{
  const account = req.user;
  var basketItemsDetails = null;
  var isKidsLinkedToAccount = null;
  if(account != null)
  {
    basketItemsDetails = await basketController.getBasketItemsDetailsForAccountId(account.id);
    isKidsLinkedToAccount = await kidController.isKidLinkedToAccountId(account.id);
  }

  res.render('terms', {user:account, basketItemsDetails:basketItemsDetails,
    isKidsLinkedToAccount:isKidsLinkedToAccount});
}

exports.privacy = async function(req,res)
{
  const account = req.user;
  var basketItemsDetails = null;
  var isKidsLinkedToAccount = null;
  if(account != null)
  {
    basketItemsDetails = await basketController.getBasketItemsDetailsForAccountId(account.id);
    isKidsLinkedToAccount = await kidController.isKidLinkedToAccountId(account.id);
  }

  res.render('privacy', {user:account, basketItemsDetails:basketItemsDetails,
    isKidsLinkedToAccount:isKidsLinkedToAccount});
}

exports.about =  async function(req,res)
{
  const account = req.user;
  var basketItemsDetails = null;
  var isKidsLinkedToAccount = null;
  if(account != null)
  {
    basketItemsDetails = await basketController.getBasketItemsDetailsForAccountId(account.id);
    isKidsLinkedToAccount = await kidController.isKidLinkedToAccountId(account.id);
  }

  res.render('about', {user:account, basketItemsDetails:basketItemsDetails,
    isKidsLinkedToAccount:isKidsLinkedToAccount});
}

exports.faqs = async function(req,res)
{
  const account = req.user;
  var basketItemsDetails = null;
  var isKidsLinkedToAccount = null;
  if(account != null)
  {
    basketItemsDetails = await basketController.getBasketItemsDetailsForAccountId(account.id);
    isKidsLinkedToAccount = await kidController.isKidLinkedToAccountId(account.id);
  }
  
  res.render('faq', {user:account, basketItemsDetails:basketItemsDetails,
    isKidsLinkedToAccount:isKidsLinkedToAccount});
}