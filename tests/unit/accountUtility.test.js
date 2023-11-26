const models = require('../../models');
const EMAIL = 'test@hotmail.com';
const ACCOUNT_NUMBER = '1234567';
const PASSWORD = 'password';
const NAME = 'John Doe';
const telephone = '12345678912';
const CUSTOMER_ACCOUNT_TYPE_ID = 2;
const ORGANISER_ACCOUNT_TYPE_ID = 3;

const accountUtility = require('../../utility/account/accountUtility');

describe('account utility tests', () => {

    beforeAll(async () => {
       await models.sequelize.sync({force: true});
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
            defaultPassword: true
        }

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
            email: 'organiser' + EMAIL,
            hashPassword: PASSWORD,
            name: NAME,
            accountTypeId: ORGANISER_ACCOUNT_TYPE_ID,
            telephoneNumber: telephone,
            defaultPassword: true
        }

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

        const accountDetail = {
            accountNumber: ACCOUNT_NUMBER,
            email: 'test' + EMAIL,
            hashPassword: PASSWORD,
            name: NAME,
            accountTypeId: ORGANISER_ACCOUNT_TYPE_ID,
            telephoneNumber: telephone,
            defaultPassword: true
        }

        const createdAccount = await accountUtility.createAccount(accountDetail);

        const getAccount = await accountUtility.getAccountById(createdAccount.id);
        expect(createdAccount.id).toBe(getAccount.id);

    });
}) 