const validator = require('validator');
const fetch = require('node-fetch');

const UK_ID = 235;

async function validateShippingDetailFields(req) {
  const errors = {};
  const {
    postCode, country, fullName, addressLine1, addressLine2, city,
  } = req;
  if (postCode === undefined || postCode.length === 0) {
    errors.postCode = 'Please enter a valid Post Code';
  }

  if (postCode.length > 0) {
    if (country !== undefined && req.body.country === UK_ID) {
      let response = await fetch(`https://api.postcodes.io/postcodes/${postCode}`);
      response = await response.json();
      if (response.status != 200) errors.postCode = response.error;
    }
  }

  if (fullName !== undefined && !validator.isLength(fullName, { min: 3 })) {
    errors.fullName = 'Full Name must be more than 3 characters long';
  }

  if (addressLine1 !== undefined && !validator.isLength(addressLine1, { min: 3 })) {
    errors.addressLine1 = 'Address Line 1 must be more than 3 characters long';
  }

  if (addressLine2 !== undefined && !validator.isLength(addressLine2, { min: 3 })) {
    errors.addressLine2 = 'Address Line 2 must be more than 3 characters long';
  }

  if (city !== undefined && !validator.isLength(city, { min: 3 })) {
    errors.city = 'City must be more than 3 characters long';
  }
}

module.exports = {
  validateShippingDetailFields,
};
