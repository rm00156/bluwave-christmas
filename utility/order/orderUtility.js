const PDFMerge = require('pdf-merge');
const archiver = require('archiver');
const fs = require('fs-extra');
const models = require('../../models');
const { PRODUCT_TYPES } = require('../product/productTypes');
const {
  downloadFiles, asyncForEachDownload, createA4PdfAsBuffer,
  uploadBodyToS3Bucket, getParsedDttmAndTime, setUpPageAndBrowser,
} = require('../general/generalUtility');
const { getClassById, getOrderFormDetailsForClassId } = require('../class/classUtility');
const {
  getSchoolFromSchoolId, getSchoolDeadlineById,
  getSchoolDeadlineBySchoolId, getClassesForSchoolId,
} = require('../school/schoolUtility');

const ORDER_INSTRUCTION_TEMPLATE = 'orderInstructions2';

async function printForm(data, i, template) {
  const date = Date.now();
  const filename = `tmp/printForm_${date}_${i}.pdf`;

  const { page, browser } = await setUpPageAndBrowser(template, data);

  await createA4PdfAsBuffer(page, filename, false, browser);

  return filename;
}

async function generateCalendarsFormPage(array, school, schoolClass, pageNumber, numberOfPages) {
  const data = {
    className: schoolClass.name,
    schoolName: school.name,
    basketItems: array,
    pageNumber,
    numberOfPages,
  };

  return printForm(data, pageNumber, 'printExtrasForm');
}

async function generatePrintFormPage(array, school, schoolClass, pageNumber, numberOfPages) {
  const data = {
    className: schoolClass.name,
    schoolName: school.name,
    basketItems: array,
    pageNumber,
    numberOfPages,
  };

  return printForm(data, pageNumber, 'printForm');
}

async function generateFormPages(cardsArray, calendarsArray, school, schoolClass) {
  let pageNumber = 1;
  const numberOfPages = cardsArray.length + calendarsArray.length;
  const files = [];
  for (let i = 0; i < cardsArray.length; i += 1) {
    const printFormPage = await generatePrintFormPage(cardsArray[i], school, schoolClass, pageNumber, numberOfPages);
    files.push(printFormPage);
    pageNumber += 1;
  }

  for (let j = 0; j < calendarsArray.length; j += 1) {
    const calendarFormPage = await generateCalendarsFormPage(calendarsArray[j], school, schoolClass, pageNumber, numberOfPages);
    files.push(calendarFormPage);
    pageNumber += 1;
  }
  return files;
}

function createPagesArray(items) {
  let count = 0;
  const itemsArray = [];
  let innerList = [];
  let numberOfItems = items.length;

  while (numberOfItems > 0) {
    if (count % 10 === 0 && count !== 0) {
      itemsArray.push(innerList);
      innerList = [];
    }

    innerList.push(items[count]);

    numberOfItems -= 1;
    if (numberOfItems === 0) itemsArray.push(innerList);
    count += 1;
  }
  return itemsArray;
}

async function getSchoolOrderInstructionBySchoolId(schoolFk) {
  return models.schoolOrderInstruction.findOne({
    where: {
      schoolFk,
    },
  });
}

async function createSchoolOrderInstruction(schoolFk, pdfPath) {
  return models.schoolOrderInstruction.create({
    schoolFk,
    createdDttm: Date.now(),
    pdfPath,
    versionNo: 1,
    deleteFl: false,
  });
}

async function updateSchoolOrderInstruction(schoolFk, pdfPath) {
  await models.schoolOrderInstruction.update({
    createdDttm: Date.now(),
    pdfPath,
    versionNo: models.sequelize.literal('versionNo + 1'),
  }, {
    where: {
      schoolFk,
    },
  });
}

async function createClassOrderInstruction(classFk, deadLineDttm, pdfPath) {
  return models.classOrderInstruction.create({
    classFk,
    deadLineDttm,
    createdDttm: Date.now(),
    pdfPath,
    deleteFl: false,
    versionNo: 1,
  });
}

async function updateClassOrderInstruction(classFk, deadLineDttm, pdfPath) {
  await models.classOrderInstruction.update({
    deadLineDttm,
    createdDttm: Date.now(),
    pdfPath,
    versionNo: models.sequelize.literal('versionNo + 1'),
  }, {
    where: {
      classFk,
    },
  });
}

async function getClassOrderInstructionByClassId(classFk) {
  return models.classOrderInstruction.findOne({
    where: {
      classFk,
    },
  });
}

async function createZipFolderWithCalendarAndCardsForPurchaseBasketId(
  now,
  purchaseBasketId,
  cardOrderItemsPath,
  calendarOrderItemsPath,
) {
  const dir = `./tmp/${now}${purchaseBasketId}_purchases`;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (cardOrderItemsPath != null) {
    fs.rename(cardOrderItemsPath, `${dir}/cards.pdf`, (err) => {
      if (err) throw err;
    });
  }

  if (calendarOrderItemsPath != null) {
    fs.rename(calendarOrderItemsPath, `${dir}/calendars.pdf`, (err) => {
      if (err) throw err;
    });
  }

  const archive = archiver('zip', { zlib: { level: 9 } });
  const fileName = `tmp/${purchaseBasketId}_${now}purchase_result.zip`;
  const stream = fs.createWriteStream(fileName);

  const archivePromise = new Promise((resolve, reject) => {
    archive
      .directory(dir, false)
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });

  await archivePromise;

  return fileName;
}

async function downloadOrderItemsForObjectId(
  orderItems,
  now,
  purchaseBasketId,
) {
  if (orderItems.length === 0) return null;

  if (orderItems.length === 1) {
    return downloadFiles(orderItems[0].fileName, 0);
  }
  const files = await asyncForEachDownload(
    orderItems,
    downloadFiles,
  );

  const path = `${process.cwd()}/tmp/${now}${purchaseBasketId}_purchased.pdf`;
  await PDFMerge(files, { output: path });
  files.forEach((file) => {
    fs.unlink(file);
  });

  return path;
}

async function getOrdersNotShipped() {
  return models.sequelize.query(
    'select distinct pb.*, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchasedDttm, DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm  from purchaseBaskets pb '
      + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
      + ' where pb.status = :completed '
      + ' and pb.shippedFl = false '
      + ' and pb.shippingAddressFk is not null '
      + ' and pb.deleteFl = false ',
    {
      replacements: { completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getOrdersForAccountId(accountId) {
  return models.sequelize.query(
    'select distinct pb.* from basketItems b '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' where pb.status = :completed '
      + ' and b.accountFk = :accountId',
    {
      replacements: { completed: 'Completed', accountId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function searchOrdersWithKidWithNoClass(
  orderNumber,
  kidCode,
  kidName,
  fromDt,
  toDt,
) {
  let query = 'select distinct pb.total, pb.orderNumber, pb.subTotal, k.name as kidName, k.code as kidCode,DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb '
    + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
    + ' inner join productItems pi on b.productItemFk = pi.id '
    + ' inner join kids k on pi.kidFk = k.id '
    + ' where pb.status = :completed '
    + ' and pb.orderNumber like :orderNumber '
    + ' and k.name like :kidName '
    + ' and k.code like :kidCode '
    + ' and k.classFk is null ';

  if (fromDt !== '') query = `${query} and pb.purchaseDttm >= :fromDt `;

  if (toDt !== '') query = `${query} and pb.purchaseDttm <= :toDt `;

  return models.sequelize.query(query, {
    replacements: {
      kidCode: `%${kidCode}%`,
      kidName: `%${kidName}%`,
      orderNumber: `%${orderNumber}%`,
      completed: 'Completed',
      fromDt,
      toDt,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function searchOrdersWithNoKid(orderNumber, fromDt, toDt) {
  let query = 'select distinct pb.total, pb.orderNumber, pb.subTotal, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb '
    + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
    + ' inner join productItems pi on b.productItemFk = pi.id '
    + ' where pb.status = :completed '
    + ' and pb.orderNumber like :orderNumber '
    + ' and pi.kidFk is null ';

  if (fromDt !== '') query = `${query} and pb.purchaseDttm >= :fromDt `;

  if (toDt !== '') query = `${query} and pb.purchaseDttm <= :toDt `;

  return models.sequelize.query(query, {
    replacements: {
      orderNumber: `%${orderNumber}%`,
      completed: 'Completed',
      fromDt,
      toDt,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function searchOrdersLinkedToASchool(
  orderNumber,
  kidCode,
  kidName,
  school,
  schoolClass,
  fromDt,
  toDt,
) {
  let query = 'select distinct pb.total, pb.subTotal,pb.orderNumber, k.name as kidName, k.code as kidCode, s.name as school, c.name as schoolClass, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from purchaseBaskets pb '
    + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
    + ' inner join productItems pi on b.productItemFk = pi.id '
    + ' inner join kids k on pi.kidFk = k.id '
    + ' inner join classes c on k.classFk = c.id '
    + ' inner join schools s on c.schoolFk = s.id '
    + ' where pb.orderNumber like :orderNumber '
    + ' and k.name like :kidName '
    + ' and k.code like :kidCode '
    + ' and s.name like :school '
    + ' and c.name like :schoolClass '
    + ' and pb.status = :completed ';

  if (fromDt !== '') query = `${query} and pb.purchaseDttm >= :fromDt `;

  if (toDt !== '') query = `${query} and pb.purchaseDttm <= :toDt `;

  return models.sequelize.query(query, {
    replacements: {
      kidCode: `%${kidCode}%`,
      kidName: `%${kidName}%`,
      orderNumber: `%${orderNumber}%`,
      completed: 'Completed',
      school: `%${school}%`,
      schoolClass: `%${schoolClass}%`,
      fromDt,
      toDt,
    },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function setOrderToShipped(purchaseBasketId) {
  await models.purchaseBasket.update(
    {
      shippedFl: true,
      shippedDttm: Date.now(),
      verisonNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: purchaseBasketId,
      },
    },
  );
}

async function setPurchaseBasketToCompleted(date, purchaseBasketId) {
  await models.purchaseBasket.update(
    {
      status: 'Completed',
      orderNumber: `blu-${purchaseBasketId}`,
      purchaseDttm: date,
    },
    {
      where: {
        id: purchaseBasketId,
      },
    },
  );
}

async function getTotalRevenues() {
  return models.sequelize.query(
    'select distinct cast(purchaseDttm as date) as dates, sum(subtotal) as subTotal from purchasebaskets '
      + ' where status = :completed '
      + ' group by dates having sum(subtotal) > 0 ',
    {
      replacements: { completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getTopFivePerformingProductVariants() {
  return models.sequelize.query(
    'select p.displayImagePath, p.name as productName, pv.name as productVariantName, pv.price,  sum(b.quantity) as totalQuantity, '
      + ' sum(b.cost) as cost from products p '
      + ' inner join productVariants pv on pv.productFk = p.id '
      + ' inner join productItems pi on pi.productVariantFk = pv.id '
      + ' inner join basketItems b on b.productItemFk = pi.id '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' where pb.status = :completed '
      + ' group by pv.id having totalQuantity > 0 '
      + ' order by totalQuantity desc limit 5 ',
    {
      replacements: { completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getSubTotalOfAllOrdersToday() {
  const result = await models.sequelize.query(
    'select sum(subTotal) as subTotal from purchaseBaskets '
      + ' where status = :completed '
      + ' and purchaseDttm > CURDATE() ',
    {
      replacements: { completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
  return result[0].subTotal === null ? 0.0 : result[0].subTotal.toFixed(2);
}

async function getTotalOrderDetails() {
  const result = await models.sequelize.query(
    'select count(id) as numberOfOrders, if(sum(subTotal) is null, 0, sum(subTotal)) as subTotal ,if(sum(total) is null, 0, sum(total)) as total from purchaseBaskets '
      + ' where status = :completed ',
    {
      replacements: { completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  return result.length === 0 ? { numberOfOrders: 0, total: 0 } : result[0];
}

async function getNumberOfOrdersToday() {
  const result = await models.sequelize.query(
    'select distinct count(id) as numberOfOrdersToday from purchasebaskets where status = :completed '
      + ' and purchaseDttm > curdate()',
    {
      replacements: { completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  return result[0].numberOfOrdersToday === null
    ? 0
    : result[0].numberOfOrdersToday;
}

async function getAverageTimeFromSignUpToPurchaseInMinutes() {
  const result = await models.sequelize.query(
    'select avg(TIMESTAMPDIFF(minute, a.created_at, pb.purchaseDttm)) as average from accounts a '
      + ' inner join basketitems b on b.accountFk = a.id '
      + ' inner join purchasebaskets pb on b.purchasebasketFk = pb.id '
      + ' where pb.status = :completed ',
    {
      replacements: { completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  return result[0].average === null
    ? 0
    : parseFloat(result[0].average).toFixed(2);
}

async function getShippingAddress(
  addressLine1,
  addressLine2,
  city,
  postCode,
  fullName,
  countryId,
) {
  return models.shippingAddress.findOne({
    where: {
      addressLine1,
      addressLine2,
      city,
      postCode,
      fullName,
      countryFk: countryId,
    },
  });
}

async function createShippingAddress(
  addressLine1,
  addressLine2,
  city,
  postCode,
  fullName,
  accountId,
  countryId,
) {
  return models.shippingAddress.create({
    addressLine1,
    addressLine2,
    city,
    postCode,
    fullName,
    accountFk: accountId,
    countryFk: countryId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getShippingDetails(
  line1,
  line2,
  city,
  postCode,
  fullName,
  country,
  accountId,
) {
  const shippingAddress = await getShippingAddress(
    line1,
    line2,
    city,
    postCode,
    fullName,
    country,
  );
  if (shippingAddress != null) return shippingAddress.id;

  const newShippingAddress = await createShippingAddress(
    line1,
    line2,
    city,
    postCode,
    fullName,
    accountId,
    country,
  );
  return newShippingAddress.id;
}

async function getPurchaseBasketByOrderNumber(orderNumber) {
  return models.purchaseBasket.findOne({
    where: {
      orderNumber,
    },
  });
}

async function getOrderItemsDetailsForOrderNumber(orderNumber) {
  return models.sequelize.query(
    'select distinct b.id as basketItemId, b.*, a.accountNumber,  b.text1 as basketItemText1, pi.*, pv.name as productVariantName, '
      + ' pv.price, p.name as productName, pb.*,DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm, DATE_FORMAT(pb.purchaseDttm, '
      + ' "%Y-%m-%d %H:%i:%s") as purchasedDttm, pb.id as purchaseBasketId from basketItems b '
      + ' inner join productItems pi on b.productItemFk = pi.id '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' inner join products p on pv.productFk = p.id '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' inner join accounts a on pi.accountFk = a.id '
      + ' where pb.status = :completed '
      + ' and pb.orderNumber = :orderNumber',
    {
      replacements: { completed: 'Completed', orderNumber },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getOrderItemsDetailsForOrderNumberWithShippingDetails(
  orderNumber,
) {
  return models.sequelize.query(
    'select distinct b.id as basketItemId, b.*,a.accountNumber,  b.text1 as basketItemText1, pi.*, pv.name as productVariantName, pv.price, p.name as productName, pb.*,DATE_FORMAT(pb.shippedDttm, "%Y-%m-%d %H:%i:%s") as shippedDttm, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchasedDttm, s.*, pb.id as purchaseBasketId  from basketItems b '
      + ' inner join productItems pi on b.productItemFk = pi.id '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' inner join products p on pv.productFk = p.id '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' inner join shippingAddresses s on pb.shippingAddressFk = s.id '
      + ' inner join accounts a on pi.accountFk = a.id '
      + ' where pb.status = :completed '
      + ' and pb.orderNumber = :orderNumber',
    {
      replacements: { completed: 'Completed', orderNumber },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getOrderDetailsForOrderNumber(orderNumber) {
  const order = await getPurchaseBasketByOrderNumber(orderNumber);

  if (order.shippingAddressFk === null) {
    return getOrderItemsDetailsForOrderNumber(orderNumber);
  }
  return getOrderItemsDetailsForOrderNumberWithShippingDetails(orderNumber);
}

async function getDeliveryOption() {
  return models.deliveryOption.findOne();
}

async function getOrdersForClassId(classId) {
  const orderedKids = await models.sequelize.query(
    'select distinct pb.*, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDttm from kids k '
      + ' inner join classes c on k.classFk = c.id '
      + ' inner join schools s on c.schoolFk = s.id '
      + ' inner join productItems pi on pi.kidFk = k.id '
      + ' inner join basketitems b on b.productItemFk = pi.id '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' where c.id = :classId '
      + ' and k.deleteFl = false '
      + ' and pb.status = :completed ',
    {
      replacements: { classId, completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  return orderedKids;
}

async function getOrderItemsForPurchaseBasketIdByProductType(
  purchaseBasketId,
  type,
) {
  return models.sequelize.query(
    'select distinct b.* from purchasebaskets pb '
      + ' inner join basketItems b on b.purchaseBasketFk = pb.id '
      + ' inner join productItems pi on b.productItemFk = pi.id '
      + ' inner join productVariants pv on pi.productVariantFk = pv.id '
      + ' inner join products p on pv.productFk = p.id '
      + ' inner join productTypes pt on p.productTypeFk = pt.id '
      + ' where pb.status = :completed '
      + ' and pt.type = :type '
      + ' and pb.id = :id ',
    {
      replacements: {
        completed: 'Completed',
        id: purchaseBasketId,
        type,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function generateOrderItemsForObjectId(cards, now, id, job, calendars) {
  const cardOrderItemsPath = await downloadOrderItemsForObjectId(
    cards,
    now,
    id,
  );

  job.progress({ percentage: 50, completed: false });

  const calendarOrderItemsPath = await downloadOrderItemsForObjectId(
    calendars,
    now,
    id,
  );

  job.progress({ percentage: 66.67, completed: false });

  const fileName = await createZipFolderWithCalendarAndCardsForPurchaseBasketId(
    now,
    id,
    cardOrderItemsPath,
    calendarOrderItemsPath,
  );

  job.progress({ percentage: 83.33, completed: false });

  const s3Stream = fs.createReadStream(fileName);

  await uploadBodyToS3Bucket(s3Stream, fileName);

  job.progress({ percentage: 100, completed: true });

  return { pdfPath: process.env.s3BucketPath + fileName };
}

async function getPdfsOfOrderItemsForPurchaseBasketId(purchaseBasketId, job) {
  // list of cards
  // list of calendars
  // order form

  job.progress({ percentage: 16.67, completed: false });
  const now = Date.now();

  const calendars = await getOrderItemsForPurchaseBasketIdByProductType(
    purchaseBasketId,
    PRODUCT_TYPES.CALENDARS,
  );

  const cards = await getOrderItemsForPurchaseBasketIdByProductType(
    purchaseBasketId,
    PRODUCT_TYPES.CHRISTMAS_CARDS,
  );

  job.progress({ percentage: 33.33, completed: false });

  return generateOrderItemsForObjectId(cards, now, purchaseBasketId, job, calendars);
}

async function createOrderInstruction(schoolClass, schoolDeadline, createFl) {
  const school = await getSchoolFromSchoolId(schoolClass.schoolFk);
  const now = Date.now();

  const unparsedDeadLine = schoolDeadline.deadLineDttm;
  const { parsedDttm } = getParsedDttmAndTime(unparsedDeadLine);

  const deadline = parsedDttm;

  const data = {
    class: schoolClass.name,
    classNumber: schoolClass.classNumber,
    school: school.name,
    schoolNumber: school.schoolNumber,
    deadline,
  };

  const filename = `tmp/OrderInstruction_${schoolClass.name}_${now}.pdf`;
  const { page, browser } = await setUpPageAndBrowser(ORDER_INSTRUCTION_TEMPLATE, data);

  const buffer = await createA4PdfAsBuffer(page, filename, true, browser);

  await uploadBodyToS3Bucket(buffer, filename);

  const pdfPath = process.env.s3BucketPath + filename;
  if (createFl) {
    await createClassOrderInstruction(schoolClass.id, schoolDeadline.deadLineDttm, pdfPath);
  } else {
    await updateClassOrderInstruction(schoolClass.id, schoolDeadline.deadLineDttm, pdfPath);
  }

  return pdfPath;
}

async function processClassOrderInstruction(classId, deadlineId, job) {
  const classOrderInstruction = await getClassOrderInstructionByClassId(
    classId,
  );

  if (job) job.progress({ percentage: 10, completed: false });

  const schoolClass = await getClassById(classId);
  const schoolDeadline = await getSchoolDeadlineById(deadlineId);

  if (job) job.progress({ percentage: 20, completed: false });

  if (classOrderInstruction === null) {
    // means that no orderinstruction has been created before
    // create order instruction
    const pdfPath = await createOrderInstruction(
      schoolClass,
      schoolDeadline,
      true,
    );
    if (job) job.progress({ percentage: 100, completed: true });
    return { pdfPath };
  }

  if (
    classOrderInstruction.deadLineDttm.toString()
    === schoolDeadline.deadLineDttm.toString()
  ) {
    // means order instruction has been created before and we would be generating the exact same copy
    const pdfPath = classOrderInstruction.pdfPath;
    if (job) job.progress({ percentage: 100, completed: true });
    return { pdfPath };
  }

  const pdfPath = await createOrderInstruction(
    schoolClass,
    schoolDeadline,
    false,
  );
  if (job) job.progress({ percentage: 100, completed: true });
  return { pdfPath };
}

async function generateCoverSheetForSchoolOrderInstructions(school, classes, now) {
  const data = { school: school.name, classTotal: classes.length, numberOfKidsPerClass: school.numberOfKidsPerClass };
  const filename = `tmp/CoverOrderInstruction_${school.name}_${now}.pdf`;

  const { page, browser } = await setUpPageAndBrowser('schoolOrderInstruction', data);
  await createA4PdfAsBuffer(page, filename, false, browser);

  return filename;
}

async function processSchoolOrderInstruction(schoolId, job) {
  const classes = await getClassesForSchoolId(schoolId);

  const school = await getSchoolFromSchoolId(schoolId);

  const deadline = await getSchoolDeadlineBySchoolId(schoolId);

  const files = [];

  job.progress({ percentage: 10, completed: false });

  const numberOfClasses = classes.length;
  for (let i = 0; i < numberOfClasses; i += 1) {
    const json = await processClassOrderInstruction(classes[i].id, deadline.id);

    const fileName = json.pdfPath.replace(process.env.s3BucketPath, '');
    const file = await downloadFiles(fileName, i);
    files.push(file);
    const newPercentage = 70 / numberOfClasses + job._progress.percentage;
    const newPercentageRounded = newPercentage.toFixed(2);
    job.progress({ percentage: parseFloat(newPercentageRounded), completed: false });
  }

  const now = Date.now();

  const coverFileName = `${process.cwd()}/${await generateCoverSheetForSchoolOrderInstructions(school, classes, now)}`;
  files.unshift(coverFileName);

  job.progress({ percentage: 80, completed: false });
  const purchaseBuffer = await PDFMerge(files, { output: `${process.cwd()}/tmp/${now}_school_order_instruction.pdf` });
  files.forEach((file) => {
    fs.unlink(file);
  });

  const fileName = `SchoolOrderInstruction/${school.name}${now}_school_order_instruction.pdf`;

  const pdfPath = process.env.s3BucketPath + fileName;

  await uploadBodyToS3Bucket(purchaseBuffer, fileName);

  job.progress({ percentage: 90, completed: false });
  const schoolOrderInstruction = await getSchoolOrderInstructionBySchoolId(schoolId);

  if (schoolOrderInstruction === null) {
    await createSchoolOrderInstruction(schoolId, pdfPath);
  } else {
    await updateSchoolOrderInstruction(schoolId, pdfPath);
  }
  job.progress({ percentage: 100, completed: true });
  return { pdfPath };
}

async function generatePrintForm(classId, job) {
  job.progress({ percentage: 0, completed: false });

  const orderFormDetails = await getOrderFormDetailsForClassId(classId);
  const {
    cards, calendars, school, schoolClass,
  } = orderFormDetails;

  job.progress({ percentage: 10, completed: false });

  const cardsArray = createPagesArray(cards);
  const calendarsArray = createPagesArray(calendars);

  job.progress({ percentage: 20, completed: false });

  const files = await generateFormPages(cardsArray, calendarsArray, school, schoolClass);

  job.progress({ percentage: 70, completed: false });
  const now = Date.now();
  // prod upload the file use file path
  const buffer = await PDFMerge(files, { output: `${process.cwd()}/tmp/${now}_printForm.pdf` });
  files.forEach((file) => {
    fs.unlink(file);
  });

  job.progress({ percentage: 90, completed: false });

  const s3FileLocation = `${school.name}/${schoolClass.name}/${now}_printForm.pdf`;
  await uploadBodyToS3Bucket(buffer, s3FileLocation);

  const s3Path = process.env.s3BucketPath + s3FileLocation;

  job.progress({ percentage: 100, completed: true });
  return { pdfPath: s3Path };
}

async function generateOrdersPdf(classId, job) {
  const now = Date.now();
  job.progress({ percentage: 10, completed: false });
  const orderFormDetails = await getOrderFormDetailsForClassId(classId);
  const {
    cards, calendars, /* schoolClass, school, */
  } = orderFormDetails;

  job.progress({ percentage: 33.33, completed: false });

  return generateOrderItemsForObjectId(cards, now, classId, job, calendars);
}

module.exports = {
  createShippingAddress,
  getAverageTimeFromSignUpToPurchaseInMinutes,
  getDeliveryOption,
  getNumberOfOrdersToday,
  getOrdersForClassId,
  getOrdersNotShipped,
  getOrderDetailsForOrderNumber,
  getOrderItemsDetailsForOrderNumber,
  getOrderItemsDetailsForOrderNumberWithShippingDetails,
  getOrdersForAccountId,
  getPurchaseBasketByOrderNumber,
  getShippingAddress,
  getShippingDetails,
  getSubTotalOfAllOrdersToday,
  getTotalOrderDetails,
  getTopFivePerformingProductVariants,
  getTotalRevenues,
  setPurchaseBasketToCompleted,
  searchOrdersWithKidWithNoClass,
  searchOrdersWithNoKid,
  searchOrdersLinkedToASchool,
  setOrderToShipped,
  getPdfsOfOrderItemsForPurchaseBasketId,
  getOrderItemsForPurchaseBasketIdByProductType,
  downloadOrderItemsForObjectId,
  processClassOrderInstruction,
  createClassOrderInstruction,
  updateClassOrderInstruction,
  getClassOrderInstructionByClassId,
  processSchoolOrderInstruction,
  getSchoolOrderInstructionBySchoolId,
  createSchoolOrderInstruction,
  updateSchoolOrderInstruction,
  generatePrintForm,
  generateOrdersPdf,
};
