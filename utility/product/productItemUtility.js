const puppeteer = require('puppeteer');
const aws = require('aws-sdk');
const models = require('../../models');

const generalUtility = require('../general/generalUtility');
const accountUtility = require('../account/accountUtility');
const kidUtility = require('../kid/kidUtility');
const productUtility = require('./productUtility');

async function createProductItem(details) {
  return models.productItem.create(details);
}

async function getProductItemByNumber(number) {
  return models.productItem.findOne({
    where: {
      productItemNumber: number,
    },
  });
}

async function getNewProductItemNumber() {
  const number = generalUtility.makeCode();

  const productItem = await getProductItemByNumber(number);

  if (productItem == null) return number;

  return getNewProductItemNumber();
}

async function generateProductItemPdf(data, productVariantItem) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const content = await generalUtility.compile(
    productVariantItem.templateName,
    data,
  );
  await page.setContent(content);

  const fileLocation = `${data.school}/${data.year}/${data.class}/`;
  const filename = `${data.name}_${data.code}.pdf`;

  await page.setViewport({ width: 1400, height: 800, deviceScaleFactor: 2 });
  const buffer = await page.pdf({
    printBackground: true,
    landscape: false,
    width: productVariantItem.width,
    height: productVariantItem.height,
  });

  await page.close();
  await browser.close();

  const s3 = new aws.S3();
  const s3FileLocation = `${fileLocation + Date.now()}_${filename}`;
  const params = {
    Bucket: process.env.bucketName,
    Body: buffer,
    Key: s3FileLocation,
    ACL: 'public-read',
  };

  const s3UploadPromise = new Promise((resolve, reject) => {
    s3.upload(params, (err, uploadData) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(uploadData);
      }
    });
  });

  await s3UploadPromise;
  const s3Path = process.env.s3BucketPath + s3FileLocation;
  return s3Path;
}

async function createProductItemObjectNoKid(
  productVariantItem,
  data,
  s3Path,
  productItemGroup,
) {
  const productItemNumber = await getNewProductItemNumber();
  const object = {
    productItemNumber,
    productVariantFk: productVariantItem.productVariantId,
    productItemGroupFk: productItemGroup.id,
    pdfPath: s3Path,
    displayItem1: false,
    displayItem2: false,
    displayItem3: false,
    accountFk: data.accountId,
    deleteFl: false,
    versionNo: 1,
  };
  for (let i = 0; i < productVariantItem.pictureCount; i += 1) {
    const index = i + 1;
    object[`picture${index}Path`] = data[`picture${index}`];
  }

  const t = await models.sequelize.transaction();
  let productItem = null;
  try {
    productItem = await createProductItem(object);
  } catch (err) {
    console.log(err);
    return t.rollback();
  }

  await t.commit();
  return productItem;
}

async function createProductItemObject(
  productVariantItem,
  data,
  kid,
  s3Path,
  productItemGroup,
) {
  const productItemNumber = await getNewProductItemNumber();
  const object = {
    productItemNumber,
    productVariantFk: productVariantItem.productVariantId,
    productItemGroupFk: productItemGroup.id,
    accountFk: kid.parentAccountFk,
    displayItem1: true,
    displayItem2: true,
    displayItem3: true,
    classFk: kid.classFk,
    text1: data.name,
    text2: data.age,
    text3: data.month,
    text4: data.school,
    text5: data.class,
    kidFk: kid.id,
    pdfPath: s3Path != null ? s3Path : productVariantItem.defaultPdf,
    deleteFl: false,
    versionNo: 1,
  };

  for (let i = 0; i < productVariantItem.pictureCount; i += 1) {
    const index = i + 1;
    object[`picture${index}Path`] = data[`picture${index}`];
  }

  const t = await models.sequelize.transaction();
  let productItem = null;
  try {
    productItem = await createProductItem(object);
  } catch (err) {
    console.log(err);

    // throw an exception
    return t.rollback();
  }

  await t.commit();
  return productItem;
}

async function createProductItemForKidPdf(
  data,
  productVariantItem,
  kid,
  productItemGroup,
) {
  const s3Path = await generateProductItemPdf(data, productVariantItem);

  return createProductItemObject(
    productVariantItem,
    data,
    kid,
    s3Path,
    productItemGroup,
  );
}

async function createProductItemPdf(data, productVariantItem) {
  const s3Path = await generateProductItemPdf(data, productVariantItem);

  return createProductItemObjectNoKid(productVariantItem, data, s3Path);
}

async function getProductItemById(id) {
  return models.productItem.findOne({
    where: {
      id,
    },
  });
}

async function setClassForProductItemByProductItemGroupId(
  classId,
  productItemGroupId,
) {
  await models.productItem.update(
    {
      classFk: classId,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        productItemGroupFk: productItemGroupId,
      },
    },
  );
}

async function getProductItemsWithProductForKid(productId, kidId) {
  return models.sequelize.query(
    'select pi.*, pv.orderNo, pv.price, pvt.type as productVariantType from productItems pi '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
      + ' where pv.productFk = :productId '
      + ' and pi.kidFk = :kidId '
      + ' and pi.deleteFl = false '
      + ' and pv.deleteFl = false ',
    {
      replacements: { productId, kidId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getProductItemsWithProductForAccount(
  productId,
  accountId,
  kidId,
) {
  let query = 'select pi.*, pv.orderNo, pv.price, pvt.type as productVariantType from productItems pi '
    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
    + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
    + ' where pv.productFk = :productId '
    + ' and pi.accountFk = :accountId '
    + ' and pi.deleteFl = false '
    + ' and pv.deleteFl = false ';

  if (kidId !== undefined) query = `${query} and pi.kidFk = :kidId `;

  return models.sequelize.query(query, {
    replacements: { kidId, productId, accountId },
    type: models.sequelize.QueryTypes.SELECT,
  });
}
async function generateProductItemForKid(
  kid,
  productId,
  dummy,
  isAccountLinkedToASchoolInScheme,
  productItemGroup,
) {
  // no productItem created at this point
  // we will be returning the created procuctItem

  let displayYears;
  let displayMonths;
  let displayBoth;

  if (kid.age !== 0 && kid.month !== 0) {
    // display both
    displayBoth = 'true';
  } else if (kid.age !== 0) {
    // display year
    displayYears = 'true';
  } else {
    // display month
    displayMonths = 'true';
  }
  const kidSchoolClassDetails = await kidUtility.getKidClassAndSchoolFromKidId(
    kid.id,
  );

  const productVariants = await productUtility.getProductVariantsForProductId(
    productId,
  );
  const array = [];

  for (let i = 0; i < productVariants.length; i += 1) {
    const productVariantItem = productVariants[i];

    const data = {
      code: kid.code,
      name: kid.name,
      age: kid.age,
      month: kid.month,
      year: 2022,
      kidId: kid.id,
      displaySchool:
        isAccountLinkedToASchoolInScheme && kidSchoolClassDetails != null,
      displayClass:
        isAccountLinkedToASchoolInScheme && kidSchoolClassDetails != null,
      displayAge: true,
      displayYears,
      displayMonths,
      displayBoth,
    };

    if (isAccountLinkedToASchoolInScheme && kidSchoolClassDetails != null) {
      data.school = kidSchoolClassDetails.school;
      data.class = kidSchoolClassDetails.class;
    }

    for (let j = 0; j < productVariantItem.pictureCount; j += 1) {
      const index = j + 1;
      data[`picture${index}`] = productVariantItem[`defaultPicture${index}Path`];
    }

    const productItem = !dummy
      ? await createProductItemForKidPdf(
        data,
        productVariantItem,
        kid,
        productItemGroup,
      )
      : await createProductItemObject(
        productVariantItem,
        data,
        kid,
        null,
        productItemGroup,
      );

    productItem.price = productVariantItem.price;
    array.push(productItem);
  }

  return array;
}

async function createProductItemGroup() {
  return models.productItemGroup.create({
    deleteFl: false,
    versionNo: 1,
  });
}

async function getProductItemsWithProductForAccountAndNotWithKid(
  productId,
  accountId,
) {
  return models.sequelize.query(
    'select pi.*, pv.orderNo, pv.price, pvt.type as productVariantType from productItems pi '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
      + ' where pv.productFk = :productId '
      + ' and pi.kidFk is null'
      + ' and pi.accountFk = :accountId '
      + ' and pi.deleteFl = false '
      + ' and pv.deleteFl = false ',
    {
      replacements: { productId, accountId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function generateProductItemNoKid(
  productId,
  dummy,
  accountId,
  productItemGroup,
) {
  const productVariants = await productUtility.getProductVariantsForProductId(
    productId,
  );
  const array = [];

  for (let i = 0; i < productVariants.length; i += 1) {
    const productVariantItem = productVariants[i];
    const data = [];

    for (let j = 0; j < productVariantItem.pictureCount; j += 1) {
      const index = j + 1;
      data[`picture${index}`] = productVariantItem[`defaultPicture${index}Path`];
    }

    data.accountId = accountId;
    const productItem = !dummy
      ? createProductItemPdf(data, productVariantItem, productItemGroup)
      : await createProductItemObjectNoKid(
        productVariantItem,
        data,
        productVariantItem.defaultPdf,
        productItemGroup,
      );

    productItem.price = productVariantItem.price;
    array.push(productItem);
  }

  return array;
}

async function createProductItems(product, kidCode, account) {
  let productItems = null;
  const isAccountLinkedToASchoolInScheme = await accountUtility.isAccountLinkedToASchoolInScheme(account.id);
  let productItemGroup;

  if (product.kidFl) {
    let kid;

    if (kidCode !== undefined) {
      kid = await kidUtility.getKidByCode(kidCode);
      // generateCard
      // create productit
      productItemGroup = await createProductItemGroup();
      productItems = await generateProductItemForKid(
        kid,
        product.id,
        false,
        isAccountLinkedToASchoolInScheme,
        productItemGroup,
      );
    } else {
      // if no kids

      kid = await kidUtility.createKid('John Doe', 5, 0, null, account);
      productItemGroup = await createProductItemGroup();
      productItems = await generateProductItemForKid(
        kid,
        product.id,
        true,
        isAccountLinkedToASchoolInScheme,
        productItemGroup,
      );
    }

    // generate the dummy card
    // if kidCode undefined then wont have to generate anything
    // should be able to just create the productitem and load screen
    return productItems;
  }
  // for now calendars are just images so dont need to go through the hassle of generating them unless this changes
  const existingProductItems = await getProductItemsWithProductForAccount(
    product.id,
    account.id,
  );

  if (existingProductItems.length === 0) {
    productItemGroup = await createProductItemGroup();
    // create productItem
    productItems = await generateProductItemNoKid(
      product.productId,
      true,
      account.id,
      productItemGroup,
    );
  } else {
    productItems = existingProductItems;
  }

  return productItems;
}

async function getProductItemDetailsByNumber(number) {
  const result = models.sequelize.query(
    'select pi.*, pi.productItemGroupFk, pv.orderNo, pv.price, pv.productFk as productId, pvt.type as productVariantType from productItems pi '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
      + ' and pi.productItemNumber = :number '
      + ' and pi.deleteFl = false '
      + ' and pv.deleteFl = false ',
    { replacements: { number }, type: models.sequelize.QueryTypes.SELECT },
  );
  return result.length === 0 ? null : result[0];
}

async function getProductVariantForProductItemId(productItemId) {
  const result = await models.sequelize.query(
    'select pv.id as productVariantId, pvt.type as productVariantType,  pv.name as productVariantName, pv.*, t.id as templateId, t.*, t.name as templateName from productVariants pv '
      + ' inner join templates t on pv.templateFk = t.id '
      + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
      + ' inner join productItems pi on pi.productVariantFk = pv.id '
      + ' where pi.id = :productItemId order by pv.orderNo asc',
    {
      replacements: { productItemId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
  return result.length === 0 ? null : result[0];
}

async function generateUpdateProductItem(kid, productId, accountId) {
  let kidSchoolClassDetails = null;
  let productItems;
  if (kid == null) {
    productItems = await getProductItemsWithProductForAccountAndNotWithKid(
      productId,
      accountId,
    );
  } else {
    kidSchoolClassDetails = await kidUtility.getKidClassAndSchoolFromKidId(
      kid.id,
    );
    productItems = await getProductItemsWithProductForKid(productId, kid.id);
  }

  console.log(productItems);
  for (let i = 0; i < productItems.length; i += 1) {
    const productItem = productItems[i];

    let displayYears;
    let displayMonths;
    let displayBoth;

    if (productItem.text2 !== 0 && productItem.text3 !== 0) {
      // display both
      displayBoth = 'true';
    } else if (productItem.text2 !== 0) {
      // display year
      displayYears = 'true';
    } else {
      // display month
      displayMonths = 'true';
    }

    const data = {
      // "school":kidSchoolClassDetails.school,
      code: productItem.productItemNumber,
      name: productItem.text1,
      age: productItem.text2,
      month: productItem.text3,
      // "class":kidSchoolClassDetails.class,
      year: 2022,
      // "kidId":kid.id,
      displaySchool: productItem.displayItem1,
      displayClass: productItem.displayItem2,
      displayAge: productItem.displayItem3,
      displayYears,
      displayMonths,
      displayBoth,
    };

    if (kidSchoolClassDetails !== null) {
      data.school = kidSchoolClassDetails.school;
      data.class = kidSchoolClassDetails.class;
    }

    const productVariantItem = await getProductVariantForProductItemId(
      productItem.id,
    );

    for (let j = 0; j < productVariantItem.pictureCount; j += 1) {
      const index = j + 1;
      data[`picture${index}`] = productItem[`picture${index}Path`];
    }

    const s3Path = await generateProductItemPdf(data, productVariantItem);
    await models.productItem.update(
      {
        pdfPath: s3Path,
      },
      {
        where: {
          id: productItem.id,
          versionNo: models.sequelize.literal('versionNo + 1'),
        },
      },
    );
  }
}

async function getPriceForProductItemId(id) {
  return models.sequelize.query(
    'select pv.price from productItems pi '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' where pi.id = :id',
    { replacements: { id }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getProductItemsForKidNumber(kidNumber) {
  const query = ' select pi.*, pv.orderNo, p.productNumber, pv.id as productVariantId, p.name as productName, p.displayImagePath, pt.type as productType, pv.name as productVariantName, pvt.type as productVariantType from productItems pi '
    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
    + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
    + ' inner join products p on pv.productFk = p.id '
    + ' inner join productTypes pt on p.productTypeFk = pt.id '
    + ' inner join kids k on pi.kidFk = k.id '
    + ' where k.code = :kidNumber ';

  return models.sequelize.query(query, {
    replacements: { kidNumber },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getProductItemsForAccountNumber(accountNumber) {
  const query = ' select pi.*, pv.orderNo, p.productNumber, pv.id as productVariantId, p.name as productName, p.displayImagePath, pt.type as productType, pv.name as productVariantName, pvt.type as productVariantType from productItems pi '
    + ' inner join productVariants pv on pi.productVariantFk = pv.id '
    + ' inner join productVariantTypes pvt on pv.productVariantTypeFk = pvt.id '
    + ' inner join products p on pv.productFk = p.id '
    + ' inner join productTypes pt on p.productTypeFk = pt.id '
    + ' inner join accounts a on pi.accountFk = a.id '
    + ' where a.accountNumber = :accountNumber ';

  return models.sequelize.query(query, {
    replacements: { accountNumber },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function createProductItemByVariantAccountAndKid(
  productVariant,
  productItemGroup,
  account,
  kid,
) {
  const productItemNumber = await getNewProductItemNumber();
  const object = {
    productItemNumber,
    productVariantFk: productVariant.id,
    productItemGroupFk: productItemGroup.id,
    pdfPath: 's3Path',
    displayItem1: false,
    displayItem2: false,
    displayItem3: false,
    accountFk: account.id,
    kidFk: kid.id,
    classFk: kid.classFk,
    deleteFl: false,
    versionNo: 1,
  };
  return createProductItem(object);
}

async function getTemplateFromProductItemId(productItemId) {
  const result = await models.sequelize.query(
    'select t.* from productItems pi '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' inner join templates t on pv.templateFk = t.id '
      + ' where pi.id = :productItemId ',
    {
      replacements: { productItemId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
  return result.length === 0 ? null : result[0];
}

async function doesProductItemStillHaveDefaultPictures(productItem) {
  const template = await getTemplateFromProductItemId(productItem.id);
  const { pictureCount } = template;
  const productVariant = await productUtility.getProductVariantById(
    productItem.productVariantFk,
  );

  for (let i = 0; i < pictureCount; i += 1) {
    const index = i + 1;
    const defaultPicture = template[`defaultPicture${index}Path`];
    const productItemPicture = productItem[`picture${index}Path`];

    if (
      defaultPicture === productItemPicture
      && (productVariant.productFk === 1
        || productVariant.productFk === 2
        || productVariant.productFk === 4)
    ) return true;

    if (
      defaultPicture === productItemPicture
      && productVariant.productFk !== 1
      && productVariant.productFk !== 2
      && productVariant.productFk !== 4
      && index > 1
    ) {
      return true;
    }
  }

  return false;
}

module.exports = {
  createProductItem,
  getProductItemByNumber,
  getNewProductItemNumber,
  getProductItemById,
  setClassForProductItemByProductItemGroupId,
  createProductItems,
  createProductItemGroup,
  getProductItemsWithProductForAccountAndNotWithKid,
  getProductItemsWithProductForAccount,
  getProductItemsWithProductForKid,
  generateProductItemNoKid,
  getProductItemDetailsByNumber,
  generateUpdateProductItem,
  getProductVariantForProductItemId,
  getPriceForProductItemId,
  getProductItemsForKidNumber,
  getProductItemsForAccountNumber,
  createProductItemByVariantAccountAndKid,
  doesProductItemStillHaveDefaultPictures,
  getTemplateFromProductItemId,
};
