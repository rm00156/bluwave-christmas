const models = require('../../models');
const { getGiveBackAmountDetailsFromOrderDetails } = require('../order/givebackUtility');
const { PRODUCT_TYPES, PRODUCT_TYPE_NAME } = require('../product/productTypes');
const { PURCHASE_BASKET_STATUS } = require('../basket/purchaseBasketStatus');

async function getAllOrderItemDetailsForClassId(classId) {
  return models.sequelize.query(
    'select distinct b.id, b.text1, pv.name, pt.type, b.quantity as quantity, b.cost, b.fileName, '
        + ' p.name as product, b.displayItem1, b.displayItem2, b.displayItem3, pb.orderNumber, c.id as classFk, a.name as parentName from classes c '
        + ' inner join productItems pi on pi.classFk = c.id '
        + ' inner join productVariants pv on pi.productVariantFk = pv.id '
        + ' inner join products p on pv.productFk = p.id '
        + ' inner join productTypes pt on p.productTypeFk = pt.id '
        + ' inner join basketItems b on b.productItemFk = pi.id '
        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
        + ' inner join accounts a on pi.accountFk = a.id '
        + ' where pb.status = :completed '
        + ' and c.id = :classId ',
    { replacements: { classId, completed: PURCHASE_BASKET_STATUS.COMPLETED }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getGiveBackAmountDetailsForClassByClassId(classId) {
  const classOrderItemDetails = await getAllOrderItemDetailsForClassId(classId);
  return getGiveBackAmountDetailsFromOrderDetails(classOrderItemDetails);
}

async function getClassAndSchoolByClassNumber(classNumber) {
  const result = await models.sequelize.query(
    'select s.id as schoolId, c.id as classId from classes c '
        + ' inner join schools s on c.schoolFk = s.id '
        + ' where c.classNumber = :classNumber ',
    {
      replacements: { classNumber },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
  return result.length === 0 ? null : result[0];
}

async function getClassByNumber(number) {
  return models.class.findOne({
    where: {
      classNumber: number,
    },
  });
}

async function getClassDetailsFromSchoolNumber(schoolNumber) {
  return models.sequelize.query('select c.*, (select count(id) from kids where classFk = c.id) as kidTotal, y.year from classes c '
        + ' inner join schools s on c.schoolFk = s.id '
        + ' inner join years y on c.yearFk = y.id '
        + ' where s.schoolNumber = :schoolNumber '
        + ' order by c.name asc', {
    replacements: {
      schoolNumber,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getClassById(id) {
  return models.class.findOne({
    where: {
      id,
    },
  });
}

async function getSchoolFromClassId(classId) {
  const result = await models.sequelize.query(
    'select s.* from schools s '
      + ' inner join classes c on c.schoolFk = s.id '
      + ' where c.id = :classId ',
    { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
  );
  return result.length === 0 ? null : result[0];
}

async function getOrderFormDetailsForClassId(classId) {
  const schoolClass = await getClassById(classId);
  const school = await getSchoolFromClassId(classId);
  const orderItemDetailsForClass = await getAllOrderItemDetailsForClassId(classId);

  const cards = orderItemDetailsForClass.filter((item) => item.name === PRODUCT_TYPE_NAME.PHOTO_PACK || item.name === PRODUCT_TYPE_NAME.STANDARD_PACK);
  const calendars = orderItemDetailsForClass.filter((item) => item.type === PRODUCT_TYPES.CALENDARS);

  return {
    cards, calendars, school, schoolClass,
  };
}

async function getOrderDetailsForAllKidsFromClassId(classId, totalKids) {
  const orders = await models.sequelize.query(
    'select count(distinct pb.id) as orderCount from purchasebaskets pb '
            + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
            + ' inner join productItems pi on b.productItemFk = pi.id '
            + ' inner join classes c on pi.classFk = c.id '
            + ' where c.id = :classId '
            + ' and pb.status = :completed ',
    { replacements: { classId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );

  const details = {
    orderCount: orders[0].orderCount,
    totalKids,
  };

  return details;
}

module.exports = {
  getGiveBackAmountDetailsForClassByClassId,
  getClassAndSchoolByClassNumber,
  getClassByNumber,
  getClassDetailsFromSchoolNumber,
  getAllOrderItemDetailsForClassId,
  getClassById,
  getOrderFormDetailsForClassId,
  getSchoolFromClassId,
  getOrderDetailsForAllKidsFromClassId,
};
