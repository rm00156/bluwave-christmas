const models = require('../../models');
const generalUtility = require('../../utility/general/generalUtility');
const accountTestHelper = require('../helper/accountTestHelper');
const adminUtility = require('../../utility/admin/adminUtility');

const DARK = 'dark';

describe('admin utility tests', () => {
  beforeEach(async () => {
    await generalUtility.pauseForTimeInSecond(0.01);
    await models.sequelize.sync({ force: true, logging: false });
  });

  afterAll(async () => {
    // Close the database connection after running tests
    await models.sequelize.close();
  });

  it('assert background setting created and get returns background setting for admin account', async () => {
    const adminAccount = await accountTestHelper.createNewAdminAccount();
    const backgroundSetting = await adminUtility.createBackgroundSetting(adminAccount.id, DARK);

    const returnedBackgroundSetting = await adminUtility.getBackgroundSetting(adminAccount.id);

    expect(backgroundSetting.id).toBe(returnedBackgroundSetting.id);
  });

  it('create a new year', async () => {
    const year = await adminUtility.createNewYear();
    const date = new Date();
    expect(year.year).toBe(date.getFullYear());
  });

  if ('get year by year', async () => {
    const year = await adminUtility.createNewYear();

    const returnYear = await adminUtility.getYearByYear(year.year);

    expect(year.id).toBe(returnYear.id);
  });
});
