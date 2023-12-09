const accountUtility = require('../../utility/account/accountUtility');
const PASSWORD = 'password';
const NAME = 'John Doe';
const telephone = '12345678912';
const {ACCOUNT_TYPE_ID} = require('../../utility/account/accountType');

async function createNewAccount(accountTypeId) {
    const accountDetail = {
        accountNumber: await accountUtility.getNewAccountCode(),
        email: await newAccountEmail(),
        hashPassword: PASSWORD,
        name: NAME,
        accountTypeId: accountTypeId,
        telephoneNumber: telephone,
        defaultPassword: true
    }

    return await accountUtility.createAccount(accountDetail);
}

async function createNewOrganiserAccount() {
    return await createNewAccount(ACCOUNT_TYPE_ID.ORGANISER);
}
   
async function createNewCustomerAccount() {
    return await createNewAccount(ACCOUNT_TYPE_ID.CUSTOMER);
}

async function createNewAdminAccount() {
    return await createNewAccount(ACCOUNT_TYPE_ID.ADMIN);
}

async function newAccountEmail() {
    const accounts = await accountUtility.getAllAccounts();
    const numberOfAccounts = accounts.length;

    return `test${numberOfAccounts + 1}@gmail.com`;
}

module.exports = {
    createNewAccount,
    createNewOrganiserAccount,
    createNewCustomerAccount,
    createNewAdminAccount,
    newAccountEmail
}