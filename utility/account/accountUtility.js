const models = require('../../models');

async function createAccount(accountDetail) {

   return await models.account.create({
        accountNumber: accountDetail.accountNumber,
        email: accountDetail.email,
        password: accountDetail.hashPassword,
        name: accountDetail.name,
        accountTypeFk: accountDetail.accountTypeId,
        telephoneNumber: accountDetail.telephoneNumber,
        defaultPassword: accountDetail.defaultPassword,
        createdAt: Date.now(),
        firstLoginFl:true,
        deleteFl: false,
        versionNo: 1
    });
}

async function getAccountById(id) {
    return await models.account.findOne({
        where:{
            id:id
        }
    })
}

async function getAccountByNumber(number) {
    return await models.account.findOne({
        where:{
            accountNumber:number
        }
    })
}

async function getNumberOfCustomers() {
    var result = await models.sequelize.query('select count(id) as numberOfCustomers from accounts where accountTypeFk = 2 ' + 
                            ' or accountTypeFk = 3 and deleteFl = false ',
                            {type: models.sequelize.QueryTypes.SELECT});
    
    return result.length == 0 ? 0 : result[0].numberOfCustomers;
}

async function getNumberOfSignUpsToday() {
    var result = await models.sequelize.query('select distinct count(id) as numberOfSignUpsToday from accounts where created_at > curdate() ',
    {type: models.sequelize.QueryTypes.SELECT});

    return result.length == 0 ? 0 : result[0].numberOfSignUpsToday;
}

module.exports = {
    createAccount,
    getAccountById,
    getAccountByNumber,
    getNumberOfCustomers,
    getNumberOfSignUpsToday
}