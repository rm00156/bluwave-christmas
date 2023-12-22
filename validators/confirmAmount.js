const validator = require('validator');
const logger = require('pino')();

function validateConfirmAmountDetails(req) {
  const errors = {};
  if (!validator.isNumeric(req.body.bankAcc)) {
    errors.bankAcc = 'Please enter a valid bank account number, must not contain characters';
    logger.error('Please enter a valid bank number');
  }

  if (!validator.isLength(req.body.bankAcc, { min: 8, max: 8 })) {
    errors.bankAcc = 'Bank account number must contain 8 digits only';
    logger.error('Please enter a valid bank number');
  }

  if (!validator.isNumeric(req.body.sortCode)) {
    errors.sortCode = 'Please enter a valid sort code, must not contain characters';
    logger.error('Please enter a valid sort code');
  }

  if (!validator.isLength(req.body.sortCode, { min: 6, max: 6 })) {
    errors.sortCode = 'Sort Code must contain 6 digits only';
    logger.error('Please enter a valid sort code');
  }

  return errors;
}

module.exports = {
  validateConfirmAmountDetails,
};
