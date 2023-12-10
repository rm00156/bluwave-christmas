const models = require('../models');

exports.getAccountById = async function (id) {
  return await getAccountById(id);
};

async function getAccountById(id) {
  return await models.account.findOne({
    where: {
      id,
    },
  });
}

exports.getAccountByNumber = async function (number) {
  return await getAccountByNumber(number);
};

async function getAccountByNumber(number) {
  return await models.account.findOne({
    where: {
      accountNumber: number,
    },
  });
}

exports.getNumberOfCustomers = async function () {
  const result = await models.sequelize.query(
    'select count(id) as numberOfCustomers from accounts where accountTypeFk = 2 '
                            + ' or accountTypeFk = 3 and deleteFl = false ',
    { type: models.sequelize.QueryTypes.SELECT },
  );

  return result.length == 0 ? 0 : result[0].numberOfCustomers;
};

exports.getNumberOfSignUpsToday = async function () {
  const result = await models.sequelize.query(
    'select distinct count(id) as numberOfSignUpsToday from accounts where created_at > curdate() ',
    { type: models.sequelize.QueryTypes.SELECT },
  );

  return result.length == 0 ? 0 : result[0].numberOfSignUpsToday;
};
