const schoolUtility = require('../../utility/school/schoolUtility');
const accountTestHelper = require('./accountTestHelper');
const kidUtility = require('../../utility/kid/kidUtility');
const adminUtility = require('../../utility/admin/adminUtility');

const CLASS_NAME = 'CLASS';
const KID_NAME = 'Kid';

const SCHOOL_DEFAULTS = {
  telephone: '12345678912',
  postCode: 'POST CODE',
  address: 'Address Line 1',
  additionalInfo: 'additional info',
  numberOfKidsPerClass: 10,
};

async function createNewSchoolWithAccount() {
  const organiserAccount = await accountTestHelper.createNewOrganiserAccount();
  const schoolDetails = await createNewSchoolDetails();
  const school = await schoolUtility.createSchool(
    schoolDetails.name,
    schoolDetails.schoolNumber,
    schoolDetails.address,
    schoolDetails.postCode,
    schoolDetails.telephone,
    organiserAccount.email,
    schoolDetails.additionalInfo,
    schoolDetails.numberOfKidsPerClass,
    organiserAccount.id,
  );
  return { organiserAccount, school };
}

async function createNewSchoolWithClass() {
  const schoolAccount = await createNewSchoolWithAccount();
  const { school } = schoolAccount;
  const year = await adminUtility.createNewYear();
  const schoolClass = await schoolUtility.createClass(CLASS_NAME, school.id, year.id);

  return { ...schoolAccount, ...{ class: schoolClass } };
}

async function createNewSchoolWithKid() {
  const schoolClassDetails = await createNewSchoolWithClass();
  const account = schoolClassDetails.organiserAccount;
  const schoolClass = schoolClassDetails.class;

  const kid = await kidUtility.createKid(KID_NAME, 1, 1, schoolClass.id, account.id);

  return { ...schoolClassDetails, ...{ kid } };
}

async function createNewSchoolWithKidWithAge(years, month) {
  const schoolClassDetails = await createNewSchoolWithClass();
  const account = schoolClassDetails.organiserAccount;
  const schoolClass = schoolClassDetails.class;

  const kid = await kidUtility.createKid(KID_NAME, years, month, schoolClass.id, account.id);

  return { ...schoolClassDetails, ...{ kid } };
}

async function createNewSchoolDetails() {
  const numberOfSchools = await schoolUtility.getNumberOfSchools();
  const name = `School${numberOfSchools + 1}`;
  const schoolNumber = await schoolUtility.generateSchoolNumber();

  const nameAndNumber = { name, schoolNumber };
  return { ...nameAndNumber, ...SCHOOL_DEFAULTS };
}

module.exports = {
  SCHOOL_DEFAULTS,
  createNewSchoolWithAccount,
  createNewSchoolWithClass,
  createNewSchoolWithKid,
  createNewSchoolWithKidWithAge
};
