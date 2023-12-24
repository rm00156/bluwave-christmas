const models = require('../../models');
const generalUtility = require('../general/generalUtility');

const DEFAULT_PICTURE = 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Pictures/1665963540329_191.png';

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
  await models.account.update(
    {
      name,
      telephoneNo,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: accountId,
      },
    },
  );
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
  const kidsPartOfSchoolScheme = await models.sequelize.query(
    'select k.* from accounts a '
      + ' inner join kids k on k.parentAccountFk = a.id '
      + ' where k.classFk is not null '
      + ' and k.deleteFl = false '
      + ' and a.id = :accountId',
    { replacements: { accountId }, type: models.sequelize.QueryTypes.SELECT },
  );

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

// TO_DO TEST
async function searchAccounts(
  name,
  email,
  accountType,
  phoneNumber,
  createdFromDt,
  createdToDt,
  accountNumber,
) {
  let query = 'select a.accountNumber,a.id, a.name, a.email, a.telephoneNumber as telephone, at.accountType, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as createdDt from accounts a '
    + ' inner join accountTypes at on a.accountTypeFk = at.id '
    + ' where (a.name like :name or a.name is null )'
    + ' and a.email like :email '
    + ' and (a.telephoneNumber like :phoneNumber or a.telephoneNumber is null) '
    + ' and a.accountNumber like :accountNumber ';

  if (accountType !== '0') query = `${query} and a.accountTypeFk = :accountType `;

  if (createdFromDt !== undefined) query = `${query} and a.created_at >= :createdFromDt `;

  if (createdToDt !== undefined) query = `${query} and a.created_at <= :createdToDt `;

  query = `${query} order by a.created_at desc`;

  return models.sequelize.query(query, {
    replacements: {
      name: `%${name}%`,
      email: `%${email}%`,
      accountType,
      phoneNumber: `%${phoneNumber}%`,
      createdFromDt: `%${createdFromDt}%`,
      createdToDt: `%${createdToDt}%`,
      accountNumber: `%${accountNumber}%`,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getAccountTypeById(id) {
  return models.accountType.findOne({
    where: {
      id,
    },
  });
}

async function getAccountsWithBasketItemsAndNoPurchaseBasket() {
  return models.sequelize.query(
    'select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at from basketitems b '
      + ' inner join accounts a on b.accountFk = a.id  where purchaseBasketfk is null '
      + ' order by a.created_at ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getAccountsWithBasketItemsWithPurchaseBasketPending() {
  return models.sequelize.query(
    'select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at from basketitems b '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' inner join accounts a on b.accountFk = a.id '
      + ' where pb.status = :pending ',
    {
      replacements: { pending: 'Pending' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getAccountsLinkedToSchoolWithNoOrder() {
  return models.sequelize.query(
    'select distinct s.name as school, a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at  from productitems pi '
      + ' inner join accounts a on pi.accountFk = a.id '
      + ' inner join classes c on c.id = pi.classFk '
      + ' inner join schools s on c.schoolFk = s.id '
      + ' where accountFk not in (select b.accountFk from purchasebaskets pb '
      + ' inner join basketitems b on b.purchasebasketFk = pb.id '
      + ' where pb.status = :completed )',
    {
      replacements: { completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getAccountsLinkedToSchoolWithNoOrderButUploadedPicture() {
  return models.sequelize.query('select distinct a.*, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as created_at  from productitems pi '
            + ' inner join accounts a on pi.accountFk = a.id where classFk is not null '
            + ' and accountFk not in (select b.accountFk from purchasebaskets pb '
            + ' inner join basketitems b on b.purchasebasketFk = pb.id '
            + ' where pb.status = :completed ) and pi.picture1Path !== :defaultPic ', {
    replacements: { completed: 'Completed', defaultPic: DEFAULT_PICTURE },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getAllAccountTypes() {
  return models.accountType.findAll();
}

module.exports = {
  createAccount,
  getAccountsWithBasketItemsAndNoPurchaseBasket,
  getAccountsWithBasketItemsWithPurchaseBasketPending,
  getAccountsLinkedToSchoolWithNoOrder,
  getAccountsLinkedToSchoolWithNoOrderButUploadedPicture,
  getAccountById,
  getAccountByNumber,
  getAllAccountTypes,
  getNumberOfCustomers,
  getNumberOfSignUpsToday,
  updateAccountNameAndNumber,
  getNewAccountCode,
  getAllAccounts,
  isAccountLinkedToASchoolInScheme,
  getAccountByEmail,
  searchAccounts,
  getAccountTypeById,
};
