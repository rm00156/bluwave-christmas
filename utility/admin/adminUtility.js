const models = require('../../models');

const BACKGROUND_COLOR = 'Background Color';

async function getBackgroundSetting(accountId) {
  return models.setting.findOne({
    where: {
      name: BACKGROUND_COLOR,
      accountFk: accountId,
    },
  });
}

async function setBackgroundSetting(value, accountId) {
  await models.setting.update({
    value,
    versionNo: models.sequelize.literal('versionNo + 1'),
  }, {
    where: {
      name: BACKGROUND_COLOR,
      accountFk: accountId,
    },
  });
}

async function createBackgroundSetting(accountId, value) {
  return models.setting.create({
    name: BACKGROUND_COLOR,
    accountFk: accountId,
    value,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getYearByYear(year) {
  return models.year.findOne({
    where: {
      year,
    },
  });
}
async function createNewYear() {
  const date = new Date();
  const currentYear = date.getFullYear();

  const year = await getYearByYear(currentYear);

  if (year) return year;

  return models.year.create({
    year: currentYear,
    deleteFl: false,
    versionNo: 1,
  });
}

module.exports = {
  getBackgroundSetting,
  createBackgroundSetting,
  getYearByYear,
  createNewYear,
  setBackgroundSetting,
};
