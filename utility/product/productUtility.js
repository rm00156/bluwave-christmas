const models = require('../../models');
const generalUtility = require('../general/generalUtility');

async function getProductByNumber(number) {
  const product = await models.sequelize.query('select p.id as productId, p.*, p.deleteFl as status, pt.type as productType from products p '
        + ' inner join productTypes pt on p.productTypeFk = pt.id '
        + ' where p.productNumber = :number ', {
    replacements: { number }, type: models.sequelize.QueryTypes.SELECT,
  });

  return product.length === 0 ? null : product[0];
}

async function createProductVariant(name, orderNo, productId, productVariantTypeId, price, templateId, defaultPdf) {
  return models.productVariant.create({
    name,
    orderNo,
    productFk: productId,
    productVariantTypeFk: productVariantTypeId,
    price,
    templateFk: templateId,
    defaultPdf,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createProductVariantTypes(id, type) {
  return models.productVariantType.create({
    id,
    type,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createTemplate(name, displayPath, width, height, textCount, pictureCount, defaultPicture1Path) {
  return models.template.create({
    name,
    displayPath,
    width,
    height,
    textCount,
    pictureCount,
    defaultPicture1Path,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getNewProductNumber() {
  const number = generalUtility.makeCode();

  const product = await getProductByNumber(number);

  if (product == null) return number;

  return getNewProductNumber();
}

async function createProduct(productTypeId, name, description, displayImagePath, saleFl, kidFl) {
  const productNumber = await getNewProductNumber();
  return models.product.create({
    productNumber,
    productTypeFk: productTypeId,
    name,
    description,
    displayImagePath,
    saleFl,
    kidFl,
    versionNo: 1,
    deleteFl: false,
  });
}

async function createProductType(type) {
  return models.productType.create({
    type,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getProductFromProductItemId(productItemId) {
  let result = await models.sequelize.query(
    ' SELECT p.* FROM productItems pi '
        + ' inner join productVariants pv on pi.productVariantFk = pv.id '
        + ' inner join products p on pv.productFk = p.id '
        + ' where pi.id = :productItemId ',
    { replacements: { productItemId }, type: models.sequelize.QueryTypes.SELECT },
  );

  result = result.length === 0 ? null : result[0];

  return result;
}

async function getProductVariantById(id) {
  return models.productVariant.findOne({
    where: {
      id,
    },
  });
}

async function getProductTypeByProductVariantId(id) {
  const productTypes = await models.sequelize.query(
    'select pt.* from productVariants pv '
        + ' inner join products p on pv.productFk = p.id '
        + ' inner join productTypes pt on p.productTypeFk = pt.id '
        + ' where pv.id = :id ',
    { replacements: { id }, type: models.sequelize.QueryTypes.SELECT },
  );
  return productTypes.length === 0 ? null : productTypes[0];
}

async function getAllProductTypes() {
  return models.sequelize.query('select * from productTypes order by id', { type: models.Sequelize.QueryTypes.SELECT });
}

async function getProductById(productId) {
  const product = await models.sequelize.query('select p.id as productId, p.*, p.deleteFl as status, pt.type as productType from products p '
        + ' inner join productTypes pt on p.productTypeFk = pt.id '
        + ' where p.id = :id ', {
    replacements: { id: productId }, type: models.sequelize.QueryTypes.SELECT,
  });

  return product.length === 0 ? null : product[0];
}

async function getAllProductsByProductTypeId(productTypeId) {
  return models.sequelize.query(
    'select distinct p.*, pv.price, pv.id as productVariantId from productTypes pt '
        + ' inner join products p on p.productTypeFk = pt.id '
        + ' inner join productVariants pv on pv.productFk = p.id '
        + ' where pt.id = :productTypeId '
        + ' and pv.orderNo = 1 '
        + ' and pv.id = (select id from productVariants where productFk = p.id limit 1)',
    {
      replacements: { productTypeId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getProductTypeByType(type) {
  return models.productType.findOne({
    where: {
      type,
      deleteFl: false,
    },
  });
}

async function getProductVariantsForProductId(productId) {
  return models.sequelize.query('select pv.id as productVariantId, pvt.type as productVariantType,  pv.name as productVariantName, pv.*, t.id as templateId, t.*, t.name as templateName from productVariants pv '
        + ' inner join templates t on pv.templateFk = t.id '
        + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
        + ' where pv.productFk = :productId order by pv.orderNo asc', { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT });
}

async function getProductVariantsForProductItemGroupId(productItemGroupId) {
  return models.sequelize.query('select distinct pv.id as productVariantId, pi.productItemNumber, pvt.type as productVariantType,  pv.name as productVariantName, pv.* from productItems pi '
        + ' inner join productItemGroups pis on pi.productItemGroupFk = pis.id '
        + ' inner join productVariants pv on pi.productVariantFk = pv.id '
        + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
        + ' where pis.id = :productItemGroupId ', {
    replacements: { productItemGroupId },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getProductByName(name) {
  return models.product.findOne({
    where: {
      name,
      deleteFl: false,
    },
  });
}

async function getProductVariantDetailsById(productVariantId) {
  const result = await models.sequelize.query('select pv.*, pvt.type as productVariantType from productVariants pv '
        + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
        + ' where pv.id = :productVariantId '
        + ' and pv.deleteFl = false ', { replacements: { productVariantId }, type: models.sequelize.QueryTypes.SELECT });
  return result.length === 0 ? null : result[0];
}

async function searchForProductByNumberNameProductTypeOrStatus(numberSearch, nameSearch, productType, status) {
  let query = 'select p.id, p.name, p.productNumber, pt.type as productType, p.deleteFl as status, pv.price from products p '
        + ' inner join productTypes pt on p.productTypeFk = pt.id '
        + ' inner join productVariants pv on pv.productFk = pv.id'
        + ' where p.name like :name '
        + ' and p.productNumber like :productNumber ';

  if (productType !== '0') query = `${query} and p.productTypeFk = :productType `;

  let searchStatus;
  if (status !== '0') {
    query = `${query} and p.deleteFl = :status`;
    searchStatus = status !== '1';
  }

  return models.sequelize.query(query, {
    replacements: {
      name: `%${nameSearch}%`,
      productNumber: `%${numberSearch}%`,
      productType,
      status: searchStatus,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getProductVariantTypeById(id) {
  return models.productVariantType.findOne({
    where: {
      id,
    },
  });
}

async function getTemplateById(id) {
  return models.template.findOne({
    where: {
      id,
    },
  });
}

module.exports = {
  createProductVariant,
  createProductVariantTypes,
  createTemplate,
  createProduct,
  createProductType,
  getProductFromProductItemId,
  getProductVariantById,
  getProductTypeByProductVariantId,
  getAllProductTypes,
  getProductByNumber,
  getProductById,
  getAllProductsByProductTypeId,
  getProductTypeByType,
  getProductVariantsForProductId,
  getProductVariantsForProductItemGroupId,
  getProductByName,
  getProductVariantDetailsById,
  searchForProductByNumberNameProductTypeOrStatus,
  getProductVariantTypeById,
  getTemplateById,
  getNewProductNumber,
};
