const models = require('../../models');
const generalUtility = require('../general/generalUtility');

async function getKidByCode(code) {
  return models.kid.findOne({
    where: {
      code,
    },
  });
}

async function generateNewKidCode() {
  const code = generalUtility.makeCode();

  const kid = await getKidByCode(code);

  if (kid == null) return code;

  return generateNewKidCode();
}

async function createKid(name, years, months, classId, parentAccountId) {
  const code = await generateNewKidCode();
  return models.kid.create({
    name,
    age: years,
    month: months,
    classFk: classId,
    parentAccountFk: parentAccountId,
    code,
    versionNo: 1,
    deleteFl: false,
  });
}

async function getKidByProductItemId(productItemId) {
  const kids = await models.sequelize.query('select k.* from productItems pi '
        + ' inner join kids k on pi.kidFk = k.id '
        + ' where pi.id = :productItemId', { replacements: { productItemId }, type: models.sequelize.QueryTypes.SELECT });

  return kids.length === 0 ? null : kids[0];
}

async function addKidToClass(kidId, classId) {
  await models.kid.update({
    classFk: classId,
    versionNo: models.sequelize.literal('versionNo + 1'),
  }, {
    where: {
      id: kidId,
    },
  });
}

async function getKidClassAndSchoolFromKidId(kidId) {
  const result = await models.sequelize.query('select s.name as school, c.name as class from kids k '
                    + ' inner join classes c on k.classFk = c.id '
                    + ' inner join schools s on c.schoolFk = s.id '
                    + ' where k.id = :kidId', { replacements: { kidId }, type: models.sequelize.QueryTypes.SELECT });

  return result.length === 0 ? null : result[0];
}

async function getKidsFromAccountIdAndProductId(accountId, productId) {
  return models.sequelize.query('select distinct k.*, pi.id as productItemId, p.productNumber, pi.productItemNumber, pi.productVariantFk as productVariantId from kids k '
                        + ' inner join productItems pi on pi.kidfk = k.id '
                        + ' inner join productVariants pv on pi.productVariantFk = pv.id '
                        + ' inner join products p on pv.productFk = p.id '
                        + ' where pi.id = (select pi2.id from productItems pi2 inner join productVariants pv on pi2.productVariantFk = pv.id where pi2.kidFk = k.id and pv.orderNo =1 limit 1) '
                        + ' and pi.accountFk = :accountId '
                        + ' and p.id = :productId ', {
    replacements: { accountId, productId },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getKidsFromAccountId(accountId) {
  const kids1 = await models.sequelize.query('select distinct k.*, pi.*, p.productNumber, pi.productItemNumber, pi.productVariantFk as productVariantId from kids k '
                        + ' inner join productitems pi on pi.kidfk = k.id '
                        + ' inner join productVariants pv on pi.productVariantFk = pv.id '
                        + ' inner join products p on pv.productFk = p.id '
                        + ' where pi.id = (select pi2.id from productitems pi2 inner join productVariants pv on pi2.productVariantFk = pv.id where pi2.kidFk = k.id and pv.orderNo =1 limit 1) '
                        + ' and pi.accountFk = :accountId', {
    replacements: { accountId },
    type: models.sequelize.QueryTypes.SELECT,
  });

  return kids1;
}

async function getKidFromAccountId(accountId) {
  return models.kid.findOne({
    where: {
      parentAccountFk: accountId,
      deleteFl: false,
    },
  });
}

async function getKidsFromClassId(classId) {
  return models.kid.findAll({
    where: {
      classFk: classId,
      deleteFl: false,
    },
  });
}

async function isKidLinkedToAccountId(accountId) {
  const kid = await getKidFromAccountId(accountId);

  return kid != null;
}

async function getKidById(id) {
  return models.kid.findOne({
    where: {
      id,
    },
  });
}

async function getNumberOfLinkedKids() {
  const result = await models.sequelize.query(
    'select count(k.id) as count from kids k '
            + ' inner join classes c on k.classFk = c.id ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
  return result[0].count;
}

async function searchForKidsWithNoClass(kidNumber, name) {
  return models.sequelize.query(
    'select * from kids '
      + ' where code like :kidNumber '
      + ' and name like :name '
      + ' and classFk is null ',
    {
      replacements: {
        kidNumber: `%${kidNumber}%`,
        name: `%${name}%`,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function searchForKidsWithClass(kidNumber, name, schoolClass, school) {
  return models.sequelize.query(
    'select k.name, k.code , s.name as school, c.name as class from kids k '
        + ' inner join classes c on k.classFk = c.id '
        + ' inner join schools s on c.schoolFk = s.id '
        + ' where k.code like :kidNumber '
        + ' and k.name like :name '
        + ' and c.name like :schoolClass '
        + ' and s.name like :school ',
    {
      replacements: {
        kidNumber: `%${kidNumber}%`,
        name: `%${name}%`,
        schoolClass: `%${schoolClass}%`,
        school: `%${school}%`,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

// async function searchForKids(kidNumber, name, school, schoolClass) {

// }

module.exports = {
  createKid,
  getKidByProductItemId,
  addKidToClass,
  getKidByCode,
  generateNewKidCode,
  getKidClassAndSchoolFromKidId,
  getKidsFromAccountIdAndProductId,
  getKidsFromAccountId,
  getKidFromAccountId,
  getKidsFromClassId,
  isKidLinkedToAccountId,
  getKidById,
  getNumberOfLinkedKids,
  searchForKidsWithNoClass,
  searchForKidsWithClass,
};
