const models = require('../../models');
const generalUtility = require('../general/generalUtility');

async function createAccount(accountDetail) {
  return models.account.create({
    accountNumber: accountDetail.accountNumber,
    email: accountDetail.email,
    password: accountDetail.hashPassword,
    name: accountDetail.name,
    accountTypeFk: accountDetail.accountTypeId,
    telephoneNumber: accountDetail.telephoneNumber,
    defaultPassword: accountDetail.defaultPassword,
    createdAt: Date.now(),
    firstLoginFl: true,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getAccountById(id) {
  return models.account.findOne({
    where: {
      id,
    },
  });
}

async function getAccountByNumber(number) {
  return models.account.findOne({
    where: {
      accountNumber: number,
    },
  });
}

async function getNumberOfCustomers() {
  const result = await models.sequelize.query(
    'select count(id) as numberOfCustomers from accounts where accountTypeFk = 2 '
                            + ' or accountTypeFk = 3 and deleteFl = false ',
    { type: models.sequelize.QueryTypes.SELECT },
  );

  return result.length === 0 ? 0 : result[0].numberOfCustomers;
}

async function getNumberOfSignUpsToday() {
  const result = await models.sequelize.query(
    'select distinct count(id) as numberOfSignUpsToday from accounts where created_at > curdate() ',
    { type: models.sequelize.QueryTypes.SELECT },
  );

  return result.length === 0 ? 0 : result[0].numberOfSignUpsToday;
}

async function updateAccountNameAndNumber(accountId, name, telephoneNo) {
  await models.account.update({
    name,
    telephoneNo,
    versionNo: models.sequelize.literal('versionNo + 1'),
  }, {
    where: {
      id: accountId,
    },
  });
}

async function getNewAccountCode() {
  const code = generalUtility.makeCode();

  const account = await getAccountByNumber(code);

  if (account == null) return code;

  return getNewAccountCode();
}

async function getAllAccounts() {
  return models.account.findAll();
}

async function isAccountLinkedToASchoolInScheme(accountId) {
  const kidsPartOfSchoolScheme = await models.sequelize.query('select k.* from accounts a '
                    + ' inner join kids k on k.parentAccountFk = a.id '
                    + ' where k.classFk is not null '
                    + ' and k.deleteFl = false '
                    + ' and a.id = :accountId', { replacements: { accountId }, type: models.sequelize.QueryTypes.SELECT });

  return kidsPartOfSchoolScheme.length !== 0;
}

async function getAccountByEmail(email) {
  return models.account.findOne({
    where: {
      email,
      deleteFl: false,
    },
  });
}

module.exports = {
  createAccount,
  getAccountById,
  getAccountByNumber,
  getNumberOfCustomers,
  getNumberOfSignUpsToday,
  updateAccountNameAndNumber,
  getNewAccountCode,
  getAllAccounts,
  isAccountLinkedToASchoolInScheme,
  getAccountByEmail,
};
