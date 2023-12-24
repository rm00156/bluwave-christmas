const queueController = require('./QueueController');
const productItemUtility = require('../utility/product/productItemUtility');
const productUtility = require('../utility/product/productUtility');
const basketUtility = require('../utility/basket/basketUtility');
const kidUtility = require('../utility/kid/kidUtility');

async function productItemNumberDefined(productItemNumber, productVariantId) {
  const productItem = await productItemUtility.getProductItemDetailsByNumber(productItemNumber);

  if (productItem === null) throw new Error(`No productItem found for productItemNumber ${productItemNumber}`);

  if (productItem.productVariantFk !== productVariantId) throw new Error(`ProductVariantId doesn't match productItem with number ${productItemNumber}`);

  const productVariant = await productUtility.getProductVariantDetailsById(productItem.productVariantFk);
  return { productItem, productVariant };
}

async function productItemNumberNotDefined(productId, account, kidCode, product, productVariantId) {
  let existingProductItems = await productItemUtility.getProductItemsWithProductForAccount(productId, account.id);
  let kid = null;

  const kids = await kidUtility.getKidsFromAccountIdAndProductId(account.id, productId);
  const existing = new Set();

  existingProductItems.forEach((element) => {
    existing.add(element.kidFk);
  });

  if (kidCode !== undefined) {
    kid = await kidUtility.getKidByCode(kidCode);
    existingProductItems = await productItemUtility.getProductItemsWithProductForAccount(productId, account.id, kid.id);
  }
  let productItem;
  let productVariant;
  if (existingProductItems.length === 0 || (existingProductItems.length / 2 !== kids.length)) {
    const productItems = await productItemUtility.createProductItems(product, kidCode, account);
    productItem = productItems[0];
    productVariant = await productUtility.getProductVariantDetailsById(productItem.productVariantFk);

    // no productItem for product
  } else if (productVariantId !== undefined) {
    productVariant = await productUtility.getProductVariantById(productVariantId);
    if (productVariant === null) {
      productItem = existingProductItems.filter((o) => o.orderNo === 1)[0];
      productVariant = await productUtility.getProductVariantDetailsById(productItem.productVariantFk);
    } else {
      throw new Error('Invalid productVariantId');
    }
  } else {
    productItem = existingProductItems.filter((o) => o.orderNo === 1)[0];
    productVariant = await productUtility.getProductVariantDetailsById(productItem.productVariantFk);
  }
  return { productItem, productVariant };
}

async function getSearchProductsPage(res) {
  const productTypes = await productUtility.getAllProductTypes();

  res.render('newAdminProducts', { productTypes });
}

async function searchProductsResults(req, res) {
  // needs to be reworked
  const {
    numberSearch, nameSearch, productType, status,
  } = req.body;

  const result = await productUtility.searchForProductByNumberNameProductTypeOrStatus(numberSearch, nameSearch, productType, status);

  res.json({ result });
}

async function getKidsListAndKidFromProductIdAndAccountId(productId, account, productItem) {
  const kids = await kidUtility.getKidsFromAccountIdAndProductId(account.id, productId);
  let kid = null;
  const kidsList = kids.filter((o) => o.id === productItem.kidFk);
  kids.forEach((item) => {
    if (item.id !== productItem.kidFk) kidsList.push(item);
  });

  if (kids != null) kid = kidsList[0];
  return { kidsList, kid };
}

async function getProductDetailsPage(req, res) {
  const { number } = req.query;
  const productDetail = await productUtility.getProductByNumber(number);

  res.render('newProductDetails', { productDetail });
}

async function getProductItemScreen(req, res) {
  // get all kids linked to account for productitem
  const account = req.user;
  const {
    productNumber, productItemNumber, kidCode, productVariantId,
  } = req.query;
  const product = await productUtility.getProductByNumber(productNumber);
  const { productId } = product;

  const basketItemsDetails = await basketUtility.getCurrentBasketItemsDetailsForAccountId(account.id);

  if (product == null) {
    throw new Error(`No product was found with number ${productNumber}`);
  }

  const { productItem, productVariant } = productItemNumber === undefined ? await productItemNumberNotDefined(productId, account, kidCode, product, productVariantId)
    : await productItemNumberDefined(productItemNumber, Number(productVariantId));

  // at this point productItem is defined
  const { kidsList, kid } = await getKidsListAndKidFromProductIdAndAccountId(productId, account, productItem);

  const productVariants = await productUtility.getProductVariantsForProductItemGroupId(productItem.productItemGroupFk);

  res.render('productItem2', {
    user: req.user,
    productItem,
    basketItemsDetails,
    product,
    productVariants,
    productVariant,
    kidsList,
    kid,
  });
}

// async function getProductItemByProductVariant(productVariantId, accountId, kidCode) {
//   let query = 'select pi.*, pvt.type as productVariantType, pv.price from productItems pi '
//         + ' inner join productVariants pv on pi.productVariantFk = pv.id '
//         + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
//         + ' where pv.id = :productVariantId '
//         + ' and pi.accountFk = :accountId '
//         + ' and pv.deleteFl = false '
//         + ' and pi.deleteFl = false';

//   let kidId = null;
//   if (kidCode != undefined) {
//     const kid = await kidController.getKidByCode(kidCode);
//     kidId = kid.id;
//     query = `${query} and pi.kidFk = :kidId `;
//   }

//   const result = await models.sequelize.query(query, {
//     replacements: {
//       productVariantId,
//       accountId,
//       kidId,
//     },
//     type: models.sequelize.QueryTypes.SELECT,
//   });

//   return result.length == 0 ? null : result[0];
// }

async function uploadAndGenerate(req, res) {
  const { productItemId } = req.body;
  const job = await queueController.addUploadAndGenerateJob(productItemId, req.body.pictureNumber, req.body.productId, req.files);
  res.json({
    id: job.id, productNumber: req.body.productNumber, productVariantId: req.body.productVariantId, totalSteps: 6,
  });
}

async function updateAndGenerate(req, res) {
  const {
    productItemId, productId, name, age, month, displaySchool, displayClass, displayAge,
  } = req.body;
  const job = await queueController.addUpdateAndGenerateJob(
    productItemId,
    productId,
    name,
    age,
    month,
    displaySchool === 'true',
    displayClass === 'true',
    displayAge === 'true',
  );

  const productItem = await productItemUtility.getProductItemById(productItemId);
  res.json({
    id: job.id, productNumber: req.body.productNumber, productVariantId: req.body.productVariantId, productItemNumber: productItem.productItemNumber, totalSteps: 4,
  });
}

async function getUploadAndGenerateJob(req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
}

async function getUpdateAndGenerateJob(req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const { process } = job.data;
    res.json({
      id, state, progress, reason, process,
    });
  }
}

module.exports = {
  getSearchProductsPage,
  searchProductsResults,
  getProductDetailsPage,
  getProductItemScreen,
  uploadAndGenerate,
  updateAndGenerate,
  getUploadAndGenerateJob,
  getUpdateAndGenerateJob,
};
