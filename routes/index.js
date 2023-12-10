const express = require('express');

const router = express.Router();
const dadController = require('../controllers/DadController');
const signUpController = require('../controllers/SignUpController');
const dashboardController = require('../controllers/DashboardController');
const organiserController = require('../controllers/OrganiserController');
const productController = require('../controllers/ProductController');
const schoolController = require('../controllers/SchoolController');
const parentController = require('../controllers/ParentController');
const kidController = require('../controllers/KidController');
const shopController = require('../controllers/ShopController');
const basketController = require('../controllers/BasketController');
const orderController = require('../controllers/OrderController');
const homeController = require('../controllers/HomeController');
const adminController = require('../controllers/AdminController');
const classController = require('../controllers/ClassController');

const {
  hasOrganiserOrAdminAuth, redirectToDashboard, isLoggedIn, hasAdminAuth,
  hasParentAuth, hasOrganiserAuth, hasDefaultPasswordAuth, organiserCreatedCard,
} = require('../middleware/hasAuth');

router.get('/about', homeController.about);
router.get('/terms', homeController.terms);
router.get('/privacy', homeController.privacy);
router.get('/', redirectToDashboard, homeController.home);
router.get('/login', redirectToDashboard, homeController.login);
router.get('/faqs', homeController.faqs);
router.get('/addSchool', isLoggedIn, hasAdminAuth, (req, res) => {
  res.render('addSchool', { user: req.user });
});

router.get('/getDelivery', isLoggedIn, dadController.getDelivery);
router.get('/addPackage', isLoggedIn, hasAdminAuth, (req, res) => {
  res.render('addPackage', { user: req.user });
});

router.post('/createPackage', isLoggedIn, hasAdminAuth, dadController.createPackage);

router.get('/addKid', isLoggedIn, hasAdminAuth, dadController.getSchools);

router.get('/addClass', isLoggedIn, hasAdminAuth, dadController.getSchools);

router.get('/getClasses', isLoggedIn, dadController.getClasses);
router.get('/getKids', isLoggedIn, dadController.getKids);

router.get('/searchClass', isLoggedIn, hasAdminAuth, dadController.searchClass);
router.get('/searchAccounts', isLoggedIn, hasAdminAuth, dadController.searchAccounts);
router.post('/searchAccounts', isLoggedIn, hasAdminAuth, adminController.searchAccounts);
router.post('/createSchool', isLoggedIn, hasAdminAuth, dadController.createSchool);
router.post('/createClass', isLoggedIn, hasAdminAuth, dadController.createClass);
router.post('/addKid', isLoggedIn, dadController.createKid);

router.get('/searchSchool', isLoggedIn, dadController.searchSchools);
router.post('/searchSchool', isLoggedIn, dadController.searchSchoolsResults);

router.get('/order', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, dadController.getOrder);

router.get('/searchKids', isLoggedIn, hasAdminAuth, dadController.searchCards);
router.post('/searchKids', isLoggedIn, hasAdminAuth, dadController.searchKidsResults);

router.post('/searchClass', isLoggedIn, hasAdminAuth, dadController.searchClassResults);
router.get('/viewCreatedCards', isLoggedIn, dadController.viewCreatedCards);

router.get('/selectPreviewCard', isLoggedIn, dadController.selectPreviewCard);
router.post('/updateCard', isLoggedIn, hasAdminAuth, dadController.updateCard);

router.get('/signup', signUpController.signupPage);
router.get('/signupOrganiser', signUpController.signupOrganiserPage);

router.get('/class', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, classController.getClassScreen);
router.get('/school', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, dadController.getSchoolScreen);

router.get('/printScreen', isLoggedIn, dashboardController.print);

router.post('/changeSchoolStep', isLoggedIn, hasAdminAuth, schoolController.changeSchoolStep);
router.post('/signup', signUpController.signup);
router.post('/signupOrganiser', signUpController.signupOrganiser);

router.get('/dashboardNew', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, dashboardController.loadScreen);
router.get('/organiserDashboard', isLoggedIn, hasDefaultPasswordAuth, hasOrganiserAuth, organiserController.loadOrganiserDashboard);

router.post('/login', signUpController.login);
// router.get('/login',signUpController.render_login);
router.get('/logout', signUpController.logout);
router.get('/linkKids', isLoggedIn, hasDefaultPasswordAuth, kidController.linkKid);
router.post('/linkKids', isLoggedIn, hasDefaultPasswordAuth, kidController.processLinkKids);
router.post('/createNewCard', isLoggedIn, hasDefaultPasswordAuth, kidController.createNewCard);

router.post('/unlinkKids', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, dashboardController.unlinkKids);

router.get('/viewPackages', isLoggedIn, dadController.viewPackages);
router.get('/viewEditCard', isLoggedIn, dashboardController.viewEditCard);

router.post('/addToBasket', isLoggedIn, hasDefaultPasswordAuth, dashboardController.addToBasket);

router.post('/addToBasket2', isLoggedIn, hasDefaultPasswordAuth, dashboardController.addToBasket2);

router.get('/basket', isLoggedIn, hasDefaultPasswordAuth, hasParentAuth, /* hasBasketAuth, */ basketController.basket);
router.get('/cards', isLoggedIn, dashboardController.cards);
router.get('/card', isLoggedIn, dashboardController.card);
router.get('/kid', isLoggedIn, organiserCreatedCard, hasDefaultPasswordAuth, dashboardController.kid);
router.get('/kid2', isLoggedIn, hasDefaultPasswordAuth, dashboardController.kid);
router.get('/getPackageWithId', isLoggedIn, dashboardController.getPackageWithId);

router.post('/purchase', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, orderController.purchase);

router.get('/orders', isLoggedIn, hasOrganiserAuth, hasDefaultPasswordAuth, organiserController.classesScreen);
router.get('/participants', isLoggedIn, hasOrganiserAuth, hasDefaultPasswordAuth, organiserController.classesScreen);
router.get('/classOrders', isLoggedIn, hasDefaultPasswordAuth, organiserController.classOrders);

router.post('/setDeadLine', isLoggedIn, hasAdminAuth, schoolController.setDeadLine);

router.post('/createProof', isLoggedIn, hasAdminAuth, dashboardController.createProof);
router.get('/createProofJob', isLoggedIn, hasAdminAuth, dashboardController.getCreateProofJob);

router.post('/createProofs', isLoggedIn, hasAdminAuth, dashboardController.createProofsForClass);
router.get('/purchaseSuccessful', isLoggedIn, hasParentAuth, orderController.purchaseSuccessful);
router.post('/createCardsForClass', isLoggedIn, hasAdminAuth, dadController.createCardsForClass);
router.get('/createCardsForClass', isLoggedIn, hasAdminAuth, dadController.getCreateCardsForClassJob);

router.get('/updateCalendarJobs', isLoggedIn, hasAdminAuth, dadController.getUpdateCalendarJob);

router.get('/updateCardJobs', isLoggedIn, hasAdminAuth, dadController.getUpdateCardJobs);
router.get('/createAdminCardJobs', isLoggedIn, hasAdminAuth, dadController.getCreateAdminCardJobs);
router.get('/createProofsForClass', isLoggedIn, hasAdminAuth, dashboardController.getCreateProofJobs);
router.get('/updatePicArtworkJobs', isLoggedIn, dadController.getUpdatePicArtworkJobs);
router.get('/updatePurchaseJobs', isLoggedIn, hasAdminAuth, dadController.getUpdatePurchaseJobs);
router.get('/createPrintForm', isLoggedIn, hasAdminAuth, dadController.getCreatePrintFormJobs);
router.get('/editCards', isLoggedIn, hasAdminAuth, dadController.editCards);

router.get('/viewProofs', isLoggedIn, hasAdminAuth, dadController.viewProofs);
router.get('/printCard', isLoggedIn, hasAdminAuth, dadController.printCard);
router.get('/generatePurchasedCards', isLoggedIn, hasAdminAuth, dadController.generatePurchasedCards);

router.post('/createCardAdmin', isLoggedIn, dadController.createCardAdmin);
router.post('/updateCardAdmin', isLoggedIn, dadController.updateCardArtworkAndPicture);
router.post('/updateCalendar', isLoggedIn, dadController.updateCalendar);

router.post('/deleteKid', isLoggedIn, hasAdminAuth, dadController.deleteKid);
router.get('/parentDashboard', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, parentController.getParentScreen);
router.get('/getCard', isLoggedIn, dadController.getCard);
router.get('/getKid', isLoggedIn, dadController.getKid);
router.get('/getBasketItems', isLoggedIn, hasDefaultPasswordAuth, dashboardController.getBasketItems);
router.post('/stripe_webhooks/checkout.session.completed', orderController.sessionCompleted);
router.post('/printForm', isLoggedIn, hasAdminAuth, dashboardController.printForm);
router.post('/generatePrintForm', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, dadController.generatePrintForm);
router.post('/addPicture', isLoggedIn, hasDefaultPasswordAuth, dadController.addPicture);
router.post('/addArtwork', isLoggedIn, hasDefaultPasswordAuth, dadController.addArtwork);

router.post('/addCalendarPicture', isLoggedIn, hasDefaultPasswordAuth, dadController.addCalendarPicture);
router.post('/uploadPicture', isLoggedIn, hasDefaultPasswordAuth, dadController.uploadPicture);
router.post('/uploadArtwork', isLoggedIn, hasDefaultPasswordAuth, dadController.uploadArtwork);

router.post('/uploadCalendarPicture', isLoggedIn, hasDefaultPasswordAuth, dadController.uploadCalendarPicture);
router.get('/classParticipants', isLoggedIn, hasOrganiserAuth, hasDefaultPasswordAuth, organiserController.classParticipants);
router.get('/signUpAdmin', /* isLoggedIn,hasAdminAuth, */ signUpController.signUpAdmin);
router.post('/signUpAdmin', /* isLoggedIn,hasAdminAuth, */ signUpController.signUpAdminPage);
router.get('/changeOrganiser', isLoggedIn, hasAdminAuth, dadController.getChangeOrganiser);
router.post('/changeOrganiser', isLoggedIn, hasAdminAuth, dadController.changeOrganiser);
router.get('/editContactDetails', isLoggedIn, dadController.getEditContactDetails);
router.post('/editContactDetails', isLoggedIn, dadController.editContactDetails);
router.get('/updatePassword', isLoggedIn, hasOrganiserAuth, dadController.getUpdatePassword);
router.post('/updatePassword', isLoggedIn, hasOrganiserAuth, dadController.updatePassword);

router.post('/editClassName', isLoggedIn, hasAdminAuth, dadController.editClassName);
router.get('/searchOrders', isLoggedIn, hasAdminAuth, dadController.orderSearch);
router.post('/searchOrders', isLoggedIn, hasAdminAuth, orderController.getSearchOrders);
router.get('/getKidCardPath', isLoggedIn, dadController.getKidCardPath);
router.get('/getCalendar', isLoggedIn, hasDefaultPasswordAuth, dadController.getCalendar);
router.get('/getCalendar2', isLoggedIn, hasDefaultPasswordAuth, dadController.getCalendar2);

router.get('/continue', schoolController.continues);
router.get('/delay', schoolController.delay);

// router.post('/setUpSocket',isLoggedIn,hasAdminAuth, dadController.setUpSocket);

router.get('/confirmAmount', isLoggedIn, hasOrganiserAuth, hasDefaultPasswordAuth, schoolController.confirmAmount);
router.get('/submit_bank_details', isLoggedIn, hasOrganiserAuth, hasDefaultPasswordAuth, schoolController.getSubmitBankDetails);
router.post('/confirmAmount', schoolController.submitConfirmAmount);
router.get('/amountConfirmed', dadController.amountConfirmed);
router.post('/generateOrderItems', isLoggedIn, hasAdminAuth, dadController.generateOrderItems);
router.post('/setShipped', isLoggedIn, hasAdminAuth, adminController.setShipped);
router.get('/forgottenPassword', dadController.forgotten);
router.post('/forgottenPassword', dadController.sendForgotEmail);
router.get('/resetSent', dadController.resetSent);
router.get('/reset', dadController.reset);
router.post('/resetPassword', dadController.resetPassword);

router.post('/generateCard', isLoggedIn, hasAdminAuth, dadController.generateCard);
router.post('/generateCalendar', isLoggedIn, hasAdminAuth, dadController.generateCalendar);

router.get('/account', isLoggedIn, hasAdminAuth, dadController.getAccount);

router.get('/createYourOwnCard', isLoggedIn, hasParentAuth, dadController.createYourOwnCard);

router.post('/updateFirstLogin', isLoggedIn, hasParentAuth, dashboardController.updateFirstLogin);

router.get('/parentDashboard2', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, dashboardController.parentDashboard);
router.get('/shop', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, shopController.shop);
router.post('/validateShippingDetails', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, dashboardController.validateShippingDetails);
router.get('/productItem', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, productController.getProductItemScreen);

router.get('/getProductItem', isLoggedIn, hasDefaultPasswordAuth, dashboardController.getProductItem);

router.post('/updateProductItem', isLoggedIn, hasDefaultPasswordAuth, dadController.updateProductItem);
router.get('/createProductItemJobs', isLoggedIn, dadController.getProductItemJob);

router.get('/orderHistory', isLoggedIn, hasParentAuth, dashboardController.getOrderHistory);
router.post('/captcha', signUpController.processCaptcha);
router.get('/hasBeenModified', isLoggedIn, hasParentAuth, dashboardController.hasBeenModified);

router.post('/setToShipped', isLoggedIn, hasAdminAuth, dadController.setToShipped);
router.get('/ordersNotShipped', isLoggedIn, hasAdminAuth, adminController.ordersNotShipped);
// router.get('/sendMissingEmail',dadController.sendMissingEmail);

// router.get('/new_product_admin', (req,res)=>{
//     res.render('newProductAdmin')
// })

router.get('/new_products_admin', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, productController.getSearchProductsPage);
router.post('/searchProducts', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, productController.searchProductsResults);
router.get('/new_product_details', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, productController.getProductDetailsPage);
router.get('/new_schools_admin', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, schoolController.getSearchSchoolsPage);
router.post('/new_search_schools', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, schoolController.searchSchoolsResults);
router.get('/new_school_details', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, schoolController.getSchoolPage);
router.get('/adminDashboard', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getAdminDashboardPage);
router.get('/new_accounts_admin', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getAdminAccountPage);
// router.get('/signup_organiser', signUpController.signupOrganiserPage);
router.get('/school_details', isLoggedIn, organiserController.getSchoolDetailsPage);
router.post('/edit_school_details', isLoggedIn, organiserController.editSchoolDetails);
router.post('/uploadAndGenerate', isLoggedIn, productController.uploadAndGenerate);
router.get('/uploadAndGenerateJob', isLoggedIn, productController.getUploadAndGenerateJob);
router.get('/updateAndGenerateJob', isLoggedIn, productController.getUpdateAndGenerateJob);
router.post('/updateAndGenerate', isLoggedIn, productController.updateAndGenerate);
router.post('/addToBasket3', isLoggedIn, hasDefaultPasswordAuth, basketController.addToBasket);
router.post('/addNewClass', isLoggedIn, hasDefaultPasswordAuth, schoolController.addNewClass);
router.post('/removeClass', isLoggedIn, hasDefaultPasswordAuth, schoolController.removeClass);

router.get('/classes', isLoggedIn, hasDefaultPasswordAuth, hasOrganiserAuth, organiserController.getClassScreen);

router.post('/removeBasketItem', isLoggedIn, hasDefaultPasswordAuth, dashboardController.removeBasketItem);
router.post('/updateBasketItemQuantity', isLoggedIn, hasDefaultPasswordAuth, hasDefaultPasswordAuth, basketController.updateBasketItem);
router.get('/parentOrders', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, orderController.getParentOrders);
router.get('/parentOrder', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, orderController.getParentOrder);
router.get('/getAccountIdForKidNumber', isLoggedIn, hasParentAuth, hasDefaultPasswordAuth, kidController.getAccountIdForKidNumber);

router.get('/getSchoolOrderInstruction', isLoggedIn, hasDefaultPasswordAuth, hasOrganiserOrAdminAuth, classController.getSchoolOrderInstruction);

router.get('/getClassOrderInstruction', isLoggedIn, hasDefaultPasswordAuth, hasOrganiserOrAdminAuth, classController.getClassOrderInstruction);
router.get('/createSchoolOrderInstructionJob', isLoggedIn, hasDefaultPasswordAuth, hasOrganiserOrAdminAuth, classController.getCreateOrderInstructionJob);

router.get('/createOrderInstructionJob', isLoggedIn, hasDefaultPasswordAuth, hasOrganiserOrAdminAuth, classController.getCreateOrderInstructionJob);
router.get('/*.html', (req, res) => {
  res.redirect('/');
});

router.get('/kidProductItems', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, kidController.getKidProductItemsScreen);
router.get('/admin_productItem', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getProductItemScreen);

router.get('/new_account_details', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getAccountDetailsPage);
router.get('/new_order_details', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, orderController.getAdminOrder);
router.get('/new_kids_admin', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getKidsSearchScreen);
router.post('/searchKidsNew', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.searchKidsResults);
router.get('/new_orders_admin', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getOrdersSearchScreen);
router.post('/new_search_orders', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.searchOrdersResults);
router.post('/generateOrderForms', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, classController.generateOrderForm);
router.post('/generatePurchasedOrders', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, classController.getPurchasedOrders);

router.post('/generateOrderDetails', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, orderController.generateOrderDetails);
router.post('/setBackground', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.setBackground);

router.get('/linkKidJob', isLoggedIn, hasDefaultPasswordAuth, kidController.linkKidJob);
router.get('/mightLike', isLoggedIn, hasDefaultPasswordAuth, basketController.mightLike);

router.get('/deadlines', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, schoolController.getDeadlinesScreen);
router.get('/give_back', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, schoolController.getGiveBacksScreen);
router.get('/display_link_school_button', isLoggedIn, hasDefaultPasswordAuth, schoolController.displayLinkSchoolButton);
router.post('/link_kid_productItemId', isLoggedIn, hasDefaultPasswordAuth, schoolController.linkKidByProductItemId);
router.get('/give_back_details', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, schoolController.getGiveBackDetailsScreen);
router.get('/kids_linked_to_schools', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getKidsLinkedToSchoolScreen);
router.get('/revenue_chart', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getRevenueChartScreen);
router.get('/getRevenues', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getRevenues);
router.get('/accounts_with_basket_items', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getAccountsWithBasketItems);
router.get('/accounts_linked_no_order', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getAccountsLinkedNoOrder);
router.get('/accounts_linked_uploaded_no_order', isLoggedIn, hasDefaultPasswordAuth, hasAdminAuth, adminController.getAccountsLinkedNoOrderButUploadedPicture);

router.post('/update_order_basket_item', isLoggedIn, hasAdminAuth, adminController.updateOrderBasketItem);

module.exports = router;
