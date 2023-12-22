const aws = require('aws-sdk');
const models = require('../models');
const dadController = require('./DadController');

const schoolUtility = require('../utility/school/schoolUtility');
const STATUS_TYPES = require('../utility/school/statusTypes');

const validator = require('../validators/shippingDetails');

// Connect to a local redis intance locally, and the Heroku-provided URL in production

// create process.env file
aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

async function getNumberOfCalendarsForOrientation(orientation) {
  return models.sequelize.query('select distinct count(p.id) as count from products p '
    + ' inner join productTypes pt on p.productTypeFk = pt.id '
    + ' where pt.type = :calendar'
    + ' and p.orientation = :orientation ', { replacements: { calendar: 'Calendars', orientation }, type: models.sequelize.QueryTypes.SELECT });
}

async function viewCards(cardsToView, req, res, pageToRender) {
  const schools = await models.school.findAll({
    order: [
      ['name', 'ASC'],
    ],
  }).then(async (results) => {
    const array = [];

    results.forEach((result) => {
      array.push(result.dataValues);
    });

    return array;
  });

  const selectedCard = cardsToView[0];

  const schoolKidArray = await models.sequelize.query('select s.id as schoolId, k.* from cards c inner join kids k on c.kidFk = k.id '
                        + ' inner join classes cl on k.classFk = cl.id '
                        + ' inner join schools s on cl.schoolFk = s.id '
                        + ' where c.id = :selectedCardId '
                        + ' and k.deleteFl = false ', {
    replacements: {
      selectedCardId: selectedCard.id,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((result) => result[0]);

  const classes = await models.class.findAll({
    where: {
      schoolFk: schoolKidArray.schoolId,
    },
    order: [
      ['name', 'ASC'],
    ],
  }).then((results) => {
    const array = [];

    results.forEach((result) => {
      array.push(result.dataValues);
    });

    return array;
  });

  const account = req.user;
  const numberOfBasketItems = await models.basketItem.findAll({
    where: {
      accountFk: account.id,
      purchaseBasketFk: null,
    },
  }).then((basketItems) => models.sequelize.query('select * from basketitems b '
                        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                        + ' where b.accountFk = :accountId '
                        + ' and pb.status = :pending', {
    replacements: {
      accountId: req.user.id, pending: 'Pending',
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((basketItems2) => basketItems.length + basketItems2.length));

  // need to extract to a method
  const packages = await dadController.viewPackages2();

  res.render(pageToRender, {
    user: req.user,
    cards: cardsToView,
    schools,
    reece: classes,
    schoolKidArray,
    numberOfBasketItems: req.user.accountTypeFk === 2 ? numberOfBasketItems : null,
    packages,
  });
}

function formatDate(date) {
  const monthNames = [
    'January', 'February', 'March',
    'April', 'May', 'June', 'July',
    'August', 'September', 'October',
    'November', 'December',
  ];

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  return `${day} ${monthNames[monthIndex]} ${year}`;
}

async function loadScreen(req, res) {
  // need an admin view
  // and a parent screen
  const account = req.user;

  if (account.accountTypeFk === 1) {
    res.render('dashboardNew', { user: req.user });
  } else if (account.accountTypeFk === 3) {
    models.school.findOne({
      where: {
        organiserAccountFk: account.id,
      },
    }).then((school) => {
      const schoolId = school.id;
      models.sequelize.query(
        'select k.* from kids k '
                + ' inner join classes c on k.classFk = c.id '
                + ' inner join schools s on c.schoolFk = s.id '
                + ' where s.id = :schoolId '
                + ' and k.deleteFl = false ',
        { replacements: { schoolId }, type: models.sequelize.QueryTypes.SELECT },
      ).then((kids) => {
        const kidTotal = kids.length;

        models.sequelize.query(
          'select distinct k.* from kids k '
                        + ' inner join classes c on k.classFk = c.id '
                        + ' inner join schools s on c.schoolFk = s.id '
                        + ' inner join basketitems b on b.kidFk = k.id '
                        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                        + ' where s.id = :schoolId '
                        + ' and pb.status = :completed '
                        + ' and k.deleteFl = false ',
          { replacements: { schoolId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
        ).then((orderedKids) => {
          const orderedKidTotal = orderedKids.length;
          let orderedPercentage = (orderedKidTotal / kidTotal) * 100;
          orderedPercentage = Math.round(orderedPercentage * 10) / 10;
          orderedPercentage = Number.isNaN(orderedPercentage) ? 0 : orderedPercentage;

          models.kid.findOne({
            where: {
              parentAccountFk: req.user.id,
            },
          }).then((kidForAccount) => {
            models.sequelize.query('select p.price, b.quantity from  basketitems b '
                                    + ' inner join packages p on b.packageFk = p.id '
                                    + ' where b.accountFk = :accountId '
                                    + ' and purchaseBasketFk is null', {
              replacements: {
                accountId: account.id,
              },
              type: models.sequelize.QueryTypes.SELECT,
            }).then((basketItems) => {
              let subTotal = 0;
              basketItems.forEach((basketItem) => {
                subTotal += parseFloat(basketItem.price) * basketItem.quantity;
              });

              models.sequelize.query('select p.price, b.quantity from basketitems b '
                                        + ' inner join packages p on b.packageFk = p.id '
                                        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                        + ' where b.accountFk = :accountId '
                                        + ' and pb.status = :pending', {
                replacements: {
                  accountId: account.id, pending: 'Pending',
                },
                type: models.sequelize.QueryTypes.SELECT,
              }).then(async (basketItems2) => {
                basketItems2.forEach((basketItem) => {
                  subTotal += parseFloat(basketItem.price) * basketItem.quantity;
                });

                const deadLine = await schoolUtility.getSchoolDeadlineBySchoolId(schoolId);

                const deadlineDetails = schoolUtility.getDeadlineDetails(deadLine);

                let statusCount = 1;
                const registered = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.REGISTERED);
                registered.dataValues.createdDttm = formatDate(registered.dataValues.createdDttm);

                const artSent = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.DEADLINE_SET);
                if (artSent != null) {
                  artSent.dataValues.createdDttm = formatDate(artSent.dataValues.createdDttm);
                  statusCount += 1;
                }

                const artReceived = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.ARTWORK_PACK_SENT);
                if (artReceived != null) {
                  artReceived.dataValues.createdDttm = formatDate(artReceived.dataValues.createdDttm);
                  statusCount += 1;
                }

                const sampleSent = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.DELAY);
                if (sampleSent != null) {
                  sampleSent.dataValues.createdDttm = formatDate(sampleSent.dataValues.createdDttm);
                  statusCount += 1;
                }

                const purchaseDeadline = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.PRINTING);
                if (purchaseDeadline != null) {
                  purchaseDeadline.dataValues.createdDttm = formatDate(purchaseDeadline.dataValues.createdDttm);
                  statusCount += 1;
                  // find the latest status which has status print or delay and display that
                }

                let printDelayStatus = await models.sequelize.query(
                  'select s.*,st.type from statuses s '
                                            + ' inner join schools sch on s.schoolFk = sch.id '
                                            + ' inner join statusTypes st on s.statusTypeFk = st.id '
                                            + ' where sch.id = :schoolId '
                                            + ' and (s.statusTypeFk = 9 or s.statusTypeFk =10 )'
                                            + ' order by s.createdDttm desc, s.statusTypeFk desc LIMIT 1',
                  { replacements: { schoolId: school.id }, type: models.sequelize.QueryTypes.SELECT },
                );

                if (printDelayStatus.length > 0) {
                  statusCount += 1;
                  printDelayStatus = printDelayStatus[0];
                  printDelayStatus.createdDttm = formatDate(printDelayStatus.createdDttm);
                } else printDelayStatus = null;

                const delivery = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.CONTRIBUTION_SENT);
                if (delivery != null) {
                  delivery.dataValues.createdDttm = formatDate(delivery.dataValues.createdDttm);
                  statusCount += 1;
                }

                // TODO - This whole method NEEDS to be looked at properly as this doesnt point to a valid statustype
                const confirmCharity = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, 14);
                if (confirmCharity != null) {
                  confirmCharity.dataValues.createdDttm = formatDate(confirmCharity.dataValues.createdDttm);
                  statusCount += 1;
                }

                const sentCharity = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, 15);
                if (sentCharity != null) {
                  sentCharity.dataValues.createdDttm = formatDate(sentCharity.dataValues.createdDttm);
                  statusCount += 1;
                }

                const response = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);
                if (response != null) {
                  response.dataValues.createdDttm = formatDate(response.dataValues.createdDttm);
                  statusCount += 1;
                }

                const displayParentSection = kidForAccount != null;

                models.sequelize.query(
                  'select st.type from statuses s '
                                            + ' inner join statusTypes st on s.statusTypeFk = st.id '
                                            + ' where s.schoolFk = :schoolId '
                                            + ' order by createdDttm desc LIMIT 1',
                  {
                    replacements: {
                      schoolId: school.id,
                    },
                    type: models.sequelize.QueryTypes.SELECT,
                  },
                ).then((currentStatus) => {
                  console.log(currentStatus);
                  res.render('organiserDashboard2', {
                    user: req.user,
                    orderedPercentage,

                    kidTotal,
                    orderedKidTotal,
                    displayParentSection,
                    numberOfBasketItems: basketItems.length + basketItems2.length,
                    subTotal,
                    deadLineDttm: deadlineDetails.deadLineDttm,
                    daysLeft: deadlineDetails.daysLeft,
                    daysLeftSign: deadlineDetails.daysLeftSign,
                    school,
                    registered,
                    artSent,
                    artReceived,
                    sampleSent,
                    purchaseDeadline,
                    printDelayStatus,
                    delivery,
                    confirmCharity,
                    sentCharity,
                    response,
                    currentStatus: currentStatus[0].type,
                    statusCount,
                  });
                });
              });
            });
          });
        });
      });
    });
  }
}

async function parentScreen(req, res, account, pageToRender) {
  const kidCardArray = await models.sequelize.query('select  k.*, c.path, s.name as schoolName, cl.name as className, c.id as cardId  from cards c '
        + ' inner join kids k on c.kidFk = k.id '
        + ' inner join classes cl on k.classFk = cl.id  '
        + ' inner join schools s on cl.schoolFk = s.id '
        + ' where k.parentAccountFk = :accountId '
        + ' and k.deleteFl = false ', {
    replacements: {
      accountId: account.id,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((result) => result);

  // need to extract to a method
  const packages = await dadController.viewPackages2();

  const result = await models.sequelize.query('select p.price, b.quantity from  basketitems b '
         + ' inner join packages p on b.packageFk = p.id '
         + ' where b.accountFk = :accountId '
         + ' and purchaseBasketFk is null', {
    replacements: {
      accountId: account.id,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((basketItems) => {
    let subTotal = 0;
    basketItems.forEach((basketItem) => {
      subTotal += parseFloat(basketItem.price) * basketItem.quantity;
    });

    return models.sequelize.query('select p.price, b.quantity from basketitems b '
            + ' inner join packages p on b.packageFk = p.id '
            + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
            + ' where b.accountFk = :accountId '
            + ' and pb.status = :pending', {
      replacements: {
        accountId: account.id, pending: 'Pending',
      },
      type: models.sequelize.QueryTypes.SELECT,
    }).then((basketItems2) => {
      basketItems2.forEach((basketItem) => {
        subTotal += parseFloat(basketItem.price) * basketItem.quantity;
      });

      return { numberOfBasketItems: basketItems.length + basketItems2.length, subTotal };
    });
  });

  models.kid.findOne({
    where: {
      parentAccountFk: req.user.id,
    },
  }).then((kidForAccount) => {
    models.sequelize.query('select b.quantity,  b.cost, p.name, p.price, pb.purchaseDttm from basketitems b '
                + ' inner join packages p on b.packageFk = p.id '
                + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                + ' where b.accountFk = :accountId '
                + ' and purchaseBasketFk is not null '
                + ' and pb.status = :completed '
                + ' order by pb.purchaseDttm asc', { replacements: { accountId: req.user.id, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT }).then((purchasedBasketItems) => {
      models.kidOrderHistory.findAll({
        where: {
          accountFk: req.user.id,
        },
      }).then((kidOrderHistories) => {
        let totalCost = 0;

        kidOrderHistories.forEach((kidOrderHistory) => {
          totalCost += parseFloat(kidOrderHistory.totalCost);
        });
        const kidIds = [];

        kidCardArray.forEach((kidCard) => {
          kidIds.push(kidCard.id);
        });

        models.sequelize.query(
          'select distinct sum(d.cost) as cost from basketitems b '
                                               + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                               + ' inner join shippingAddresses s on pb.shippingAddressFk = s.id '
                                               + ' inner join deliveryCosts d on pb.deliveryCostFk = d.id '
                                            + ' where b.accountFk = :accountId '
                                            + ' and pb.status= :completed',
          { replacements: { accountId: req.user.id, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
        ).then(async (cost) => {
          // models.deliveryCost.findOne().then(delivery=>{
          const totalDelivery = (cost[0].cost) === null ? 0.00 : (cost[0].cost).toFixed(2);
          // var count = shippings.length;
          // var totalDelivery =  (count * delivery.cost).toFixed(2);

          totalCost = (parseFloat(totalCost) + parseFloat(totalDelivery)).toFixed(2);
          const displayParentSection = kidForAccount != null;

          const categoryResults = await models.sequelize.query('select distinct p.*, pk.price as price from products p '
                                + ' inner join productTypes pt on p.productTypeFk = pt.id '
                                + ' inner join packages pk on pk.productTypeFk = pt.id '
                                + ' ORDER BY RAND() LIMIT 4', { type: models.sequelize.QueryTypes.SELECT });

          res.render(pageToRender, {
            user: req.user,
            kidIds,
            kids: kidCardArray,
            packages,
            numberOfBasketItems: result.numberOfBasketItems,
            subTotal: result.subTotal,
            displayParentSection,
            purchasedBasketItems,
            totalCost,
            totalDelivery,
            categoryResults,
          });

          // })
        });
      });
    });
  });
}

async function addToBasket2(req, res) {
  const { quantity } = req.body;
  const { packageId } = req.body;
  const { productItemId } = req.body;
  const { kidId } = req.body;
  const accountId = req.user.id;
  let kidObject;

  if ((kidId === undefined || kidId === null)) kidObject = null;
  else {
    kidObject = await models.kid.findOne({
      where: {
        id: kidId,
      },
    });
  }

  models.package.findOne({
    where: {
      id: packageId,
    },
  }).then((p) => {
    const cost = parseInt(quantity, 10) * parseFloat(p.price);

    models.productItem.findOne({
      where: {
        id: productItemId,
      },
    })
      .then((productItem) => {
        if (productItem.picture != null) {
          const path = productItem.pdfPath;
          const fileName = path.replace(process.env.s3BucketPath, '');
          models.basketItem.build({
            path,
            kidFk: (kidId === undefined || kidId === null) ? null : kidId,
            kidName: (kidObject === null) ? null : kidObject.name,
            fileName,
            packageFk: packageId,
            quantity,
            accountFk: accountId,
            cost,
            picture: productItem.picture,
          }).save().then(() => {
            models.basketItem.findAll({
              where: {
                accountFk: accountId,
                purchaseBasketFk: null,
              },
            }).then((basketItems) => {
              models.sequelize.query('select * from basketitems b '
                                + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                + ' where b.accountFk = :accountId '
                                + ' and pb.status = :pending', {
                replacements: {
                  accountId, pending: 'Pending',
                },
                type: models.sequelize.QueryTypes.SELECT,
              }).then((basketItems2) => {
                let subTotal = 0;
                basketItems.forEach((basketItem) => {
                  subTotal += parseFloat(basketItem.cost);
                });

                basketItems2.forEach((baskeItem2) => {
                  subTotal += parseFloat(baskeItem2.cost);
                });
                const numberOfBasketItems = basketItems.length + basketItems2.length;
                res.json({ numberOfBasketItems, subTotal: subTotal.toFixed(2) });
              });
            });
          });
        } else {
          res.json({ error: 'Please add picture to the card before attempting to add to basket' });
        }
      });
  });
}

function addToBasket(req, res) {
  const { quantity } = req.body;
  const { kidId } = req.body;
  const { packageId } = req.body;

  models.kid.findOne({
    where: {
      id: kidId,
      deleteFl: false,
    },
  }).then((kidObject) => {
    const accountId = req.user.id;

    models.package.findOne({
      where: {
        id: packageId,
      },
    }).then((p) => {
      const cost = parseInt(quantity, 10) * parseFloat(p.price);
      if (packageId === 3) {
        let path;
        const { color } = req.body;
        const { orientation } = req.body;
        models.calendar.findOne({
          where: {
            kidFk: kidId,
          },
        }).then(async (calendar) => {
          if (orientation === 'portrait') {
            if (color === 'red') {
              path = calendar.portraitRedPath;
            } else if (color === 'green') {
              path = calendar.portraitGreenPath;
            } else {
              path = calendar.portraitBluePath;
            }
          } else if (color === 'red') {
            path = calendar.landscapeRedPath;
          } else if (color === 'green') {
            path = calendar.landscapeGreenPath;
          } else {
            path = calendar.landscapeBluePath;
          }

          const fileName = path.replace(process.env.s3BucketPath, '');
          await models.basketItem.create({
            path,
            kidFk: kidId,
            kidName: kidObject.name,
            fileName,
            packageFk: packageId,
            quantity,
            accountFk: accountId,
            cost,
            color,
            orientation,
            picture: calendar.calendarPicture,
          });

          models.basketItem.findAll({
            where: {
              accountFk: accountId,
              purchaseBasketFk: null,
            },
          }).then((basketItems) => {
            models.sequelize.query('select * from basketitems b '
                            + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                            + ' where b.accountFk = :accountId '
                            + ' and pb.status = :pending', {
              replacements: {
                accountId, pending: 'Pending',
              },
              type: models.sequelize.QueryTypes.SELECT,
            }).then((basketItems2) => {
              let subTotal = 0;
              basketItems.forEach((basketItem) => {
                subTotal += parseFloat(basketItem.cost);
              });

              basketItems2.forEach((baskeItem2) => {
                subTotal += parseFloat(baskeItem2.cost);
              });
              const numberOfBasketItems = basketItems.length + basketItems2.length;
              res.json({ numberOfBasketItems, subTotal: subTotal.toFixed(2) });
            });
          });
        });
      } else {
        models.card.findOne({
          where:
                    {
                      kidFk: kidId,
                    },
        }).then(async (cardObject) => {
          const path = packageId === 1 ? cardObject.path : cardObject.package2Path;
          const cardFileName = packageId === 1 ? cardObject.fileName : cardObject.package2FileName;
          const picture = packageId === 1 ? kidObject.artwork : kidObject.picture;

          await models.basketItem.create({
            packageFk: req.body.packageId,
            quantity,
            kidFk: kidId,
            kidName: kidObject.name,
            accountFk: accountId,
            cost,
            path,
            fileName: cardFileName,
            displaySchool: kidObject.displaySchool,
            displayClass: kidObject.displayClass,
            displayAge: kidObject.displayAge,
            picture,
          });

          models.basketItem.findAll({
            where: {
              accountFk: accountId,
              purchaseBasketFk: null,
            },
          }).then((basketItems) => {
            models.sequelize.query('select * from basketitems b '
                            + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                            + ' where b.accountFk = :accountId '
                            + ' and pb.status = :pending', {
              replacements: {
                accountId, pending: 'Pending',
              },
              type: models.sequelize.QueryTypes.SELECT,
            }).then((basketItems2) => {
              let subTotal = 0;
              basketItems.forEach((basketItem) => {
                subTotal += parseFloat(basketItem.cost);
              });

              basketItems2.forEach((baskeItem2) => {
                subTotal += parseFloat(baskeItem2.cost);
              });

              const numberOfBasketItems = basketItems.length + basketItems2.length;
              res.json({ numberOfBasketItems, subTotal: subTotal.toFixed(2) });
            });
          });
        });
      }
    });
  });
}

async function linkKid(req, res) {
  const account = req.user;
  const {
    month, age, name, code, basket,
  } = req.query;

  const newBasket = (basket === true) ? 'true' : 'false';
  models.basketItem.findAll({
    where: {
      accountFk: account.id,
      purchaseBasketFk: null,
    },
  }).then((basketItems) => {
    models.kid.findOne({
      where: {
        parentAccountFk: req.user.id,
      },
    }).then((kid) => {
      const displayParentSection = kid != null;

      models.sequelize.query('select * from basketItems b '
                        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                        + ' where b.accountFk = :accountId '
                        + ' and pb.status = :pending', {
        replacements: {
          accountId: req.user.id, pending: 'Pending',
        },
        type: models.sequelize.QueryTypes.SELECT,
      }).then((basketItems2) => {
        res.render('linkKid2', {
          user: req.user,
          numberOfBasketItems: basketItems.length + basketItems2.length,
          displayParentSection,
          accountLinkedByAdmin: req.query.accountId,
          name,
          age,
          month,
          code,
          newBasket,
        });
      });
    });
  });
}

function unlinkKids(req, res) {
  const ids = req.body['ids[]'];

  models.kid.update(
    {
      parentAccountFk: null,
    },
    {
      where: {
        id: ids,
      },
    },
  ).then(() => {
    res.json({});
  });
}

function linkKids(req, res) {
  const errors = {};
  const { kidCode } = req.body;
  const { kidAge } = req.body;
  const { kidName } = req.body;
  const { kidMonth } = req.body;
  const { accountLinkedByAdmin } = req.body;
  models.kid.findOne({
    where:
        {
          code: kidCode,
          age: kidAge,
          month: kidMonth,
          name: kidName,
          deleteFl: false,
        },
  }).then((kid) => {
    if (kid === null) {
      errors.errors = 'No kid with these details, please make sure to enter the information correctly and please try again.';
      res.json({ errors });
    } else if (kid.parentAccountFk != null) {
      errors.errors = 'This kid has already been linked to an account.';
      res.json({ errors });
    } else {
      models.kid.update({
        parentAccountFk: (accountLinkedByAdmin) === '' ? req.user.id : accountLinkedByAdmin,
      }, {
        where: {
          id: kid.id,
          deleteFl: false,
        },
      }).then(() => {
        res.json({ accountType: req.user.accountTypeFk, accountLinkedByAdmin, kidId: kid.id });
      });
    }
  });
}

async function viewEditCard(req, res) {
  const cardArray = await models.sequelize.query(' select  c.* from cards c inner join kids k on c.kidFk = k.id '
    + ' where k.parentAccountFk = :accountId '
    + ' and k.deleteFl = false ', {
    replacements: {
      accountId: req.user.id,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((result) => result);

  viewCards(cardArray, req, res, 'viewCards');
}

function getBasketItems(req, res) {
  let basketItemIds = req.query.data;
  basketItemIds = basketItemIds.split('"').join('').replace('[', '').replace(']', '')
    .split(',');

  //  res.json({basketItems:''});
  models.basketItem.findAll({
    where: {
      id: basketItemIds,
    },
  }).then((basketItems) => {
    res.json({ basketItems });
  });
}

async function updateBasketItemQuantity(req, res) {
  const { newQuantity } = req.body;
  const { basketItemId } = req.body;

  return models.basketItem.findOne({
    where: {
      id: basketItemId,
    },
  }).then((basketItem) => models.package.findOne({
    where: {
      id: basketItem.packageFk,
    },
  }).then((p) => {
    const newCost = newQuantity * (parseFloat(p.price));

    return models.basketItem.update({
      quantity: newQuantity,
      cost: newCost,
    }, {
      where: {
        id: basketItemId,
      },
    }).then(() => res.json({ success: 'success' }));
  }));
}

async function shop(req, res) {
  // get the number of portrait calendars
  // get number of landscape portraits;
  const portraitCount = await getNumberOfCalendarsForOrientation('Portrait');
  const landscapeCount = await getNumberOfCalendarsForOrientation('Landscape');

  let orientation = null;
  const category = req.query.category === undefined ? 'New Card Designs' : req.query.category;
  let categoryResults = null;
  models.basketItem.findAll({
    where: {
      accountFk: req.user.id,
      purchaseBasketFk: null,
    },
  }).then((basketItems) => {
    models.sequelize.query('select * from basketitems b '
        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
        + ' where b.accountFk = :accountId '
        + ' and pb.status = :pending', {
      replacements: {
        accountId: req.user.id, pending: 'Pending',
      },
      type: models.sequelize.QueryTypes.SELECT,
    }).then(async (basketItems2) => {
      const numberOfBasketItems = basketItems.length + basketItems2.length;

      if (category === 'Calendars') {
        orientation = req.query.orientation;
        // get calendar product for orientation
        categoryResults = await models.sequelize.query('select distinct p.*, pk.price as price from products p '
            + ' inner join productTypes pt on p.productTypeFk = pt.id '
            + ' inner join packages pk on pk.productTypeFk = pt.id '
            + ' where pt.type = :calendar'
            + ' and p.orientation = :orientation ', { replacements: { calendar: 'Calendars', orientation }, type: models.sequelize.QueryTypes.SELECT });

        res.render('shop', {
          user: req.user,
          category,
          portraitCount: portraitCount[0].count,
          landscapeCount: landscapeCount[0].count,
          categoryResults,
          numberOfBasketItems,
          displayParentSection: true,
        });
      } else {
        categoryResults = await models.sequelize.query('select distinct p.*, pk.price as price from products p '
                + ' inner join productTypes pt on p.productTypeFk = pt.id '
                + ' inner join packages pk on pk.productTypeFk = pt.id '
                + ' where pt.type = :category ', { replacements: { category, orientation }, type: models.sequelize.QueryTypes.SELECT });
        res.render('shop', {
          user: req.user,
          category,
          portraitCount: portraitCount[0].count,
          landscapeCount: landscapeCount[0].count,
          categoryResults,
          numberOfBasketItems,
          displayParentSection: true,
        });
      }
    });
  });

  // res.render('shop',{user:req.user,category:category, portraitCount:portraitCount[0].count, landscapeCount:landscapeCount[0].count,
  //                     categoryResults:categoryResults});
}

function parentDashboard(req, res) {
  parentScreen(req, res, req.user, 'parentDashboard');
}

function getOrderHistory(req, res) {
  models.basketItem.findAll({
    where: {
      accountFk: req.user.id,
      purchaseBasketFk: null,
    },
  }).then((basketItems) => {
    models.sequelize.query('select * from basketitems b '
        + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
        + ' where b.accountFk = :accountId '
        + ' and pb.status = :pending', {
      replacements: {
        accountId: req.user.id, pending: 'Pending',
      },
      type: models.sequelize.QueryTypes.SELECT,
    }).then(async (basketItems2) => {
      const numberOfBasketItems = basketItems.length + basketItems2.length;

      models.sequelize.query('select b.quantity,  b.cost, p.name, p.price, pb.purchaseDttm from basketitems b '
                + ' inner join packages p on b.packageFk = p.id '
                + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                + ' where b.accountFk = :accountId '
                + ' and purchaseBasketFk is not null '
                + ' and pb.status = :completed '
                + ' order by pb.purchaseDttm asc', { replacements: { accountId: req.user.id, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT }).then((purchasedBasketItems) => {
        models.kidOrderHistory.findAll({
          where: {
            accountFk: req.user.id,
          },
        }).then((kidOrderHistories) => {
          let totalCost = 0;

          kidOrderHistories.forEach((kidOrderHistory) => {
            totalCost += parseFloat(kidOrderHistory.totalCost);
          });
          // var kidIds = [];

          // kidCardArray.forEach(kid=>{
          //     kidIds.push(kid.id);
          // })

          models.sequelize.query(
            'select distinct sum(d.cost) as cost from basketitems b '
                                               + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                               + ' inner join shippingAddresses s on pb.shippingAddressFk = s.id '
                                               + ' inner join deliveryCosts d on pb.deliveryCostFk = d.id '
                                            + ' where b.accountFk = :accountId '
                                            + ' and pb.status= :completed',
            { replacements: { accountId: req.user.id, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
          ).then(async (cost) => {
            // models.deliveryCost.findOne().then(delivery=>{
            const totalDelivery = (cost[0].cost) === null ? 0.00 : (cost[0].cost).toFixed(2);
            // var count = shippings.length;
            // var totalDelivery =  (count * delivery.cost).toFixed(2);

            totalCost = (parseFloat(totalCost) + parseFloat(totalDelivery)).toFixed(2);
            res.render('orderHistory', {
              user: req.user,
              numberOfBasketItems,
              displayParentSection: true,
              purchasedBasketItems,
              totalCost,
              totalDelivery,
            });
          });
        });
      });
    });
  });
}

function getProductItem(req, res) {
  const id = req.query.productItemId;

  models.productItem.findOne({
    where: {
      id,
    },
  }).then((productItem) => {
    res.json({ productItem });
  });
}

async function validateShippingDetails(req, res) {
  const errors = await validator.validateShippingDetailFields(req);

  res.json({ errors });
}

function parentDashboard2(req, res) {
  parentScreen(req, res, req.user, 'parentDashboard2');
}

function removeBasketItem(req, res) {
  const { basketItemId } = req.body;

  models.basketItem.destroy({
    where: {
      id: basketItemId,
    },
  }).then(() => {
    res.json({ success: 'success' });
  });
}

async function hasBeenModified(req, res) {
  const { kidId } = req.query;

  const kidObject = await models.kid.findOne({
    where: {
      id: kidId,
    },
  });

  const { name } = kidObject;
  const { artwork } = kidObject;

  if (name === 'John Doe' || artwork === 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Artwork/Default/goesHere.png?versionId=on3S9HuQzOw9ODk7DAJZXu289axUWjeL'
        || artwork === 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Artwork/Default/goesHere.png') res.json({ error: 'error' });
  else res.json({});
}

module.exports = {
  addToBasket,
  addToBasket2,
  getBasketItems,
  getProductItem,
  getOrderHistory,
  hasBeenModified,
  linkKid,
  linkKids,
  loadScreen,
  parentDashboard,
  parentDashboard2,
  removeBasketItem,
  shop,
  unlinkKids,
  updateBasketItemQuantity,
  validateShippingDetails,
  viewEditCard,
};
