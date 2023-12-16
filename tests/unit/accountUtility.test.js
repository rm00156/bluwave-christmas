const models = require('../../models');
const generalUtility = require('../../utility/general/generalUtility');
const accountTestHelper = require('../helper/accountTestHelper');

const EMAIL = 'test@hotmail.com';
const ACCOUNT_NUMBER = '1234567';
const PASSWORD = 'password';
const NAME = 'John Doe';
const telephone = '12345678912';
const CUSTOMER_ACCOUNT_TYPE_ID = 2;
const ORGANISER_ACCOUNT_TYPE_ID = 3;

const accountUtility = require('../../utility/account/accountUtility');

describe('account utility tests', () => {
  beforeEach(async () => {
    await generalUtility.pauseForTimeInSecond(0.01);
    await models.sequelize.sync({ force: true, logging: false });
  });

  afterAll(async () => {
    // Close the database connection after running tests
    await models.sequelize.close();
  });

  it('create new customer account', async () => {
    const accountDetail = {
      accountNumber: ACCOUNT_NUMBER,
      email: EMAIL,
      hashPassword: PASSWORD,
      name: NAME,
      accountTypeId: CUSTOMER_ACCOUNT_TYPE_ID,
      telephoneNumber: telephone,
      defaultPassword: true,
    };

    const createdAccount = await accountUtility.createAccount(accountDetail);

    expect(createdAccount.email).toBe(accountDetail.email);
    expect(createdAccount.accountNumber).toBe(accountDetail.accountNumber);
    expect(createdAccount.password).toBe(accountDetail.hashPassword);
    expect(createdAccount.name).toBe(accountDetail.name);
    expect(createdAccount.accountTypeFk).toBe(accountDetail.accountTypeId);
    expect(createdAccount.telephoneNumber).toBe(accountDetail.telephoneNumber);
    expect(createdAccount.defaultPassword).toBe(accountDetail.defaultPassword);
    expect(createdAccount.firstLoginFl).toBe(true);
    expect(createdAccount.deleteFl).toBe(false);
    expect(createdAccount.versionNo).toBe(1);
  });

  it('create new organiser account', async () => {
    const accountDetail = {
      accountNumber: ACCOUNT_NUMBER,
      email: `organiser${EMAIL}`,
      hashPassword: PASSWORD,
      name: NAME,
      accountTypeId: ORGANISER_ACCOUNT_TYPE_ID,
      telephoneNumber: telephone,
      defaultPassword: true,
    };

    const createdAccount = await accountUtility.createAccount(accountDetail);

    expect(createdAccount.email).toBe(accountDetail.email);
    expect(createdAccount.accountNumber).toBe(accountDetail.accountNumber);
    expect(createdAccount.password).toBe(accountDetail.hashPassword);
    expect(createdAccount.name).toBe(accountDetail.name);
    expect(createdAccount.accountTypeFk).toBe(accountDetail.accountTypeId);
    expect(createdAccount.telephoneNumber).toBe(accountDetail.telephoneNumber);
    expect(createdAccount.defaultPassword).toBe(accountDetail.defaultPassword);
    expect(createdAccount.firstLoginFl).toBe(true);
    expect(createdAccount.deleteFl).toBe(false);
    expect(createdAccount.versionNo).toBe(1);
  });

  it('get account by id', async () => {
    const createdAccount = await accountTestHelper.createNewCustomerAccount();

    const getAccount = await accountUtility.getAccountById(createdAccount.id);
    expect(createdAccount.id).toBe(getAccount.id);
  });

  it('get account by number', async () => {
    const createdAccount = await accountTestHelper.createNewCustomerAccount();

    const getAccount = await accountUtility.getAccountByNumber(createdAccount.accountNumber);
    expect(createdAccount.id).toBe(getAccount.id);
  });

  it('get number of customer accounts, number of signups today and number of accounts', async () => {
    const customerAccount = await accountTestHelper.createNewCustomerAccount();
    const organiserAccount = await accountTestHelper.createNewOrganiserAccount();
    const adminAccount = await accountTestHelper.createNewAdminAccount();

    const numberOfCustomers = await accountUtility.getNumberOfCustomers();
    expect(numberOfCustomers).toBe(2);

    const numberOfSignUpsToday = await accountUtility.getNumberOfSignUpsToday();
    expect(numberOfSignUpsToday).toBe(3);

    const accountIds = [customerAccount.id, organiserAccount.id, adminAccount.id];
    const getAllAccounts = await accountUtility.getAllAccounts();
    expect(getAllAccounts.map((account) => account.id)).toEqual(accountIds);
  });

  it('update account name and accountNumber', async () => {
    const account = await accountTestHelper.createNewCustomerAccount();
    const name = 'NEW_NAME';
    const telephoneNumber = '09876543526';

    await accountUtility.updateAccountNameAndNumber(account.id, name, telephoneNumber);

    const updateAccount = await accountUtility.getAccountById(account.id);
    expect(updateAccount.name).toBe(name);
    expect(updateAccount.telephone);
  });

  it('verify generated newAccountCode doesnt return an account number which already exists', async () => {
    await accountTestHelper.createNewCustomerAccount();

    const newAccountCode = await accountUtility.getNewAccountCode();
    const account = await accountUtility.getAccountByNumber(newAccountCode);

    expect(account).toBeNull();
  });

  it('get account by email', async () => {

    const account = await accountTestHelper.createNewCustomerAccount();

    const getAccount = await accountUtility.getAccountByEmail(account.email);
    
    expect(getAccount.id).toBe(account.id)
  })
});
