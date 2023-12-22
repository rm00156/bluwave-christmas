const validator = require('validator');
const logger = require('pino')();
const accountUtility = require('../utility/account/accountUtility');
const schoolUtility = require('../utility/school/schoolUtility');

function validateCreateUserFields(req) {
  const errors = {};
  if (req.body.email !== undefined && !validator.isEmail(req.body.email)) {
    errors.email = 'Please use a valid email address';
    logger.error('Please use a valid email address');
  }

  if (req.body.reEmail !== undefined && req.body.email !== req.body.reEmail) {
    errors.email = "Email addresses don't match";
    logger.error("Email addresses don't match");
  }

  if (
    req.body.password !== undefined
    && !validator.isAscii(req.body.password)
  ) {
    errors.password = 'Invalid characters in password';
    logger.error('Invalid characters in password');
  }
  if (
    req.body.password !== undefined
    && !validator.isLength(req.body.password, { min: 5, max: 25 })
  ) {
    errors.password = 'Please ensure that the password length is at least 5 characters long and no more than 25';
    logger.error(
      'Please ensure that the password length is at least 5 characters long and no more than 25',
    );
  }

  if (
    req.body.rePassword !== undefined
    && req.body.rePassword !== req.body.password
  ) {
    errors.password = "Passwords don't match";
    logger.error("Passwords don't match");
  }

  if (
    req.body.telephoneNo !== undefined
    && !validator.isLength(req.body.telephoneNo, { min: 11, max: 50 })
  ) {
    errors.telephoneNo = 'Please enter a valid phone number (eg 11 digits)';
    logger.error('Please enter a valid phone number (eg 11 digits)');
  }

  if (
    req.body.telephoneNo !== undefined
    && !validator.isNumeric(req.body.telephoneNo)
  ) {
    errors.telephoneNo = 'Please enter a valid phone number (eg 11 digits)';
    logger.error('Please enter a valid phone number (eg 11 digits)');
  }

  // change to regex to include white spaces with a-zA-Z

  if (
    req.body.postCode !== undefined
    && !validator.isLength(req.body.postCode, { min: 5, max: 8 })
  ) {
    errors.postCode = 'Please enter a valid post code';
    logger.error('Please enter a valid post code');
  }

  if (
    req.body.address !== undefined
    && !validator.isLength(req.body.address, { min: 1, max: 100 })
  ) {
    errors.address = 'Please enter an address with length between 1 and 100 characters';
  }

  if (
    req.body.name !== undefined
    && !validator.isLength(req.body.name, { min: 1, max: 50 })
    && (req.body.name.includes('zolkits') || req.body.name.includes('Zolkits'))
  ) {
    errors.name = 'Please enter an Name with length between 1 and 50 characters';
  }

  if (
    req.body.numberOfPupils !== undefined
    && (!validator.isLength(req.body.numberOfPupils, { min: 1 })
      || req.body.numberOfPupils < 1)
  ) {
    errors.numberOfPupils = 'Please enter a value';
  }

  if (
    req.body.numberOfClasses !== undefined
    && (!validator.isLength(req.body.numberOfClasses, { min: 1 })
      || req.body.numberOfClasses < 1)
  ) {
    errors.numberOfClasses = 'Please enter a value';
  }

  return errors;
}

async function validateUser(req) {
  const { email } = req.body;

  // populates the errors array if any errors found
  const errors = validateCreateUserFields(req);

  const user = await accountUtility.getAccountByEmail(email);

  if (user !== null) {
    // user already exists
    errors.email = 'An account with this email already exists. Please log in';
    logger.error('An account with this email already exists. Please log in');
  }

  return errors;
}

function onlySpaces(str) {
  return str.trim().length === 0;
}

function validateClasses(classArray, req) {
  const classSet = new Set();
  const errors = {};
  for (let i = 0; i < classArray.length; i += 1) {
    const index = classArray[i];
    const classValue = req.body[`class${index}`];
    classSet.add(classValue);

    if (onlySpaces(classValue)) errors[`class${index}`] = 'Please enter a correct class name';
  }

  if (classSet.size !== classArray.length) {
    errors.classes = 'A class name has been entered more than once. No duplicate class names allowed';
  }

  return errors;
}

function validateOrganiserUserFields(req) {
  const errors = {};
  if (req.body.email !== undefined && !validator.isEmail(req.body.email)) {
    errors.email = 'Please use a valid email address';
    logger.error('Please use a valid email address');
  }

  if (
    req.body.password !== undefined
    && !validator.isAscii(req.body.password)
  ) {
    errors.password = 'Invalid characters in password';
    logger.error('Invalid characters in password');
  }

  if (
    req.body.password !== undefined
    && !validator.isLength(req.body.password, { min: 5, max: 25 })
  ) {
    errors.password = 'Please ensure that the password length is at least 5 characters long and no more than 25';
    logger.error(
      'Please ensure that the password length is at least 5 characters long and no more than 25',
    );
  }

  if (
    req.body.rePassword !== undefined
    && req.body.rePassword !== req.body.password
  ) {
    errors.password = "Passwords don't match";
    logger.error("Passwords don't match");
  }

  if (
    req.body.telephoneNo !== undefined
    && !validator.isLength(req.body.telephoneNo, { min: 11, max: 50 })
  ) {
    errors.telephoneNo = 'Please enter a valid phone number (eg 11 digits)';
    logger.error('Please enter a valid phone number (eg 11 digits)');
  }

  if (
    req.body.telephoneNo !== undefined
    && !validator.isNumeric(req.body.telephoneNo)
  ) {
    errors.telephoneNo = 'Please enter a valid phone number (eg 11 digits)';
    logger.error('Please enter a valid phone number (eg 11 digits)');
  }

  if (
    req.body.postCode !== undefined
    && !validator.isLength(req.body.postCode, { min: 5, max: 8 })
  ) {
    errors.postCode = 'Please enter a valid post code';
    logger.error('Please enter a valid post code');
  }

  if (
    req.body.address !== undefined
    && !validator.isLength(req.body.address, { min: 1, max: 100 })
  ) {
    errors.address = 'Please enter an address with length between 1 and 100 characters';
  }

  if (
    req.body.name !== undefined
    && !validator.isLength(req.body.name, { min: 1, max: 50 })
    && (req.body.name.includes('zolkits') || req.body.name.includes('Zolkits'))
  ) {
    errors.name = 'Please enter an Name with length between 1 and 50 characters';
  }

  if (
    req.body.numberOfKidsPerClass !== undefined
    && !validator.isNumeric(req.body.numberOfKidsPerClass)
    && req.body.numberOfKidsPerClass.length < 12
  ) {
    errors.numberOfKidsPerClass = 'Please enter a number';
  }

  const classArray = req.body['classArray[]'];

  if (classArray !== null || classArray !== undefined) {
    const classErrors = validateClasses(classArray, req);
    return { ...errors, ...classErrors };
  }
  return errors;
}

async function validateOrganiserSignup(req) {
  // return new Promise((resolve, reject) => {
  // populates the errors array if any errors found
  const errors = validateOrganiserUserFields(req);
  const { email, school, postCode } = req.body;
  const account = await accountUtility.getAccountByEmail(email);

  if (account !== null) errors.account = 'An account already exists for this email, please login';

  const existingSchool = await schoolUtility.getSchoolWithNameAndPostCode(
    school,
    postCode,
  );

  if (existingSchool !== null) errors.school = 'A school already exists with this name and post code';

  return errors;
}

module.exports = {
  validateOrganiserSignup,
  validateUser,
  validateOrganiserUserFields,
  validateCreateUserFields,
};
