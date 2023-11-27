const models = require('../../models');
const generalUtility = require('../general/generalUtility');

async function createKid(name, years, months, classId, parentAccountId, code) {
    return await models.kid.create({
        name:name,
        age:years,
        month: months,
        classFk: classId,
        parentAccountFk: parentAccountId,
        code:code,
        versionNo: 1,
        deleteFl: false
    });
}

async function getKidByProductItemId(productItemId) {
    return await models.sequelize.query('select k.* from productItems pi ' +
        ' inner join kids k on pi.kidFk = k.id ' +
        ' where pi.id = :productItemId', { replacements: { productItemId: productItemId }, type: models.sequelize.QueryTypes.SELECT });
}

async function addKidToClass(kidId, classId) {
    await models.kid.update({
        classFk: classId,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: kidId
        }
    });
}

async function getKidByCode(code) {
    return await models.kid.findOne({
        where: {
            code: code
        }
    })
}

async function generateNewKidCode() {
    var code = generalUtility.makeCode();

    var kid = await getKidByCode(code);

    if (kid == null)
        return code;

    return await generateNewKidCode();
}

module.exports = {
    createKid,
    getKidByProductItemId,
    addKidToClass,
    getKidByCode,
    generateNewKidCode
}
