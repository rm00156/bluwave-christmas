const models = require('../../models');
const BACKGROUND_COLOR = 'Background Color';

async function getBackgroundSetting(accountId) {
    return await models.setting.findOne({
      where: {
            name: BACKGROUND_COLOR,
            accountFk: accountId
        }
    });
}

async function createBackgroundSetting(accountId, value) {
    return await models.setting.create({
        name: BACKGROUND_COLOR,
        accountFk: accountId,
        value: value,
        deleteFl: false,
        versionNo: 1
    })
}

async function getYearByYear(year) {
    return models.year.findOne({
        where: {
            year: year
        }
    })
}
async function createNewYear() {
    const date = new Date();
    const currentYear = date.getFullYear();

    const year = await getYearByYear(currentYear);

    if(year)
        return year;

    return models.year.create({
        year: currentYear,
        deleteFl: false,
        versionNo: 1
    })

}

module.exports = {
    getBackgroundSetting,
    createBackgroundSetting,
    getYearByYear,
    createNewYear
}
