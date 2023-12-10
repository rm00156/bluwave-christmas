const models = require('../../models');
const orderUtility = require('../order/orderUtility');
const { PURCHASE_BASKET_STATUS } = require('../basket/purchaseBasketStatus');

async function getAllOrderItemDetailsForClassId(classId) {
  return models.sequelize.query(
    'select distinct b.id, pv.name, pt.type, b.quantity as quantity, b.cost  from classes c '
        + ' inner join productItems pi on pi.classFk = c.id '
        + ' inner join productVariants pv on pi.productVariantFk = pv.id '
        + ' inner join products p on pv.productFk = p.id '
        + ' inner join productTypes pt on p.productTypeFk = pt.id '
        + ' inner join basketItems b on b.productItemFk = pi.id '
        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
        + ' where pb.status = :completed '
        + ' and c.id = :classId ',
    { replacements: { classId, completed: PURCHASE_BASKET_STATUS.COMPLETED }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getGiveBackAmountDetailsForClassByClassId(classId) {
  const classOrderItemDetails = await getAllOrderItemDetailsForClassId(classId);
  return orderUtility.getGiveBackAmountDetailsFromOrderDetails(classOrderItemDetails);
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

module.exports = {
  getGiveBackAmountDetailsForClassByClassId,
  getClassAndSchoolByClassNumber,
  getClassByNumber,
  getClassDetailsFromSchoolNumber,
  getAllOrderItemDetailsForClassId,
  getClassById,
};
