const puppeteer = require('puppeteer');
const aws = require('aws-sdk');
const fs = require('fs-extra');
const PDFMerge = require('pdf-merge');
const models = require('../models');
const dadController = require('./DadController');
const queueController = require('./QueueController');

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

const loadScreen = async function (req, res) {
  // need an admin view
  // and a parent screen
  const account = req.user;

  if (account.accountTypeFk == 1) {
    res.render('dashboardNew', { user: req.user });
  } else if (account.accountTypeFk == 3) {
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
          orderedPercentage = isNaN(orderedPercentage) ? 0 : orderedPercentage;

          models.kid.findOne({
            where: {
              parentAccountFk: req.user.id,
            },
          }).then((kid) => {
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
                  statusCount++;
                }

                const artReceived = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.ARTWORK_PACK_SENT);
                if (artReceived != null) {
                  artReceived.dataValues.createdDttm = formatDate(artReceived.dataValues.createdDttm);
                  statusCount++;
                }

                const sampleSent = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.DELAY);
                if (sampleSent != null) {
                  sampleSent.dataValues.createdDttm = formatDate(sampleSent.dataValues.createdDttm);
                  statusCount++;
                }

                const purchaseDeadline = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.PRINTING);
                if (purchaseDeadline != null) {
                  purchaseDeadline.dataValues.createdDttm = formatDate(purchaseDeadline.dataValues.createdDttm);
                  statusCount++;
                  // find the latest status which has status print or delay and display that
                }

                const printDelayStatus = await models.sequelize.query(
                  'select s.*,st.type from statuses s '
                                            + ' inner join schools sch on s.schoolFk = sch.id '
                                            + ' inner join statusTypes st on s.statusTypeFk = st.id '
                                            + ' where sch.id = :schoolId '
                                            + ' and (s.statusTypeFk = 9 or s.statusTypeFk =10 )'
                                            + ' order by s.createdDttm desc, s.statusTypeFk desc LIMIT 1',
                  { replacements: { schoolId: school.id }, type: models.sequelize.QueryTypes.SELECT },
                );

                if (printDelayStatus.length > 0) {
                  statusCount++;
                  printDelayStatus = printDelayStatus[0];
                  printDelayStatus.createdDttm = formatDate(printDelayStatus.createdDttm);
                } else printDelayStatus = null;

                const delivery = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.CONTRIBUTION_SENT);
                if (delivery != null) {
                  delivery.dataValues.createdDttm = formatDate(delivery.dataValues.createdDttm);
                  statusCount++;
                }

                // TODO - This whole method NEEDS to be looked at properly as this doesnt point to a valid statustype
                const confirmCharity = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, 14);
                if (confirmCharity != null) {
                  confirmCharity.dataValues.createdDttm = formatDate(confirmCharity.dataValues.createdDttm);
                  statusCount++;
                }

                const sentCharity = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, 15);
                if (sentCharity != null) {
                  sentCharity.dataValues.createdDttm = formatDate(sentCharity.dataValues.createdDttm);
                  statusCount++;
                }

                const response = await schoolUtility.getSchoolStatusByStatusTypeId(school.id, STATUS_TYPES.STATUS_TYPES_ID.COMPLETE);
                if (response != null) {
                  response.dataValues.createdDttm = formatDate(response.dataValues.createdDttm);
                  statusCount++;
                }

                const displayParentSection = kid != null;

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
};

const parentScreen = async function (req, res, account, pageToRender) {
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
  }).then((kid) => {
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
        const kidIds = new Array();

        kidCardArray.forEach((kid) => {
          kidIds.push(kid.id);
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
          const totalDelivery = (cost[0].cost) == null ? 0.00 : (cost[0].cost).toFixed(2);
          // var count = shippings.length;
          // var totalDelivery =  (count * delivery.cost).toFixed(2);

          totalCost = (parseFloat(totalCost) + parseFloat(totalDelivery)).toFixed(2);
          const displayParentSection = kid != null;

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
};

exports.addToBasket2 = async function (req, res) {
  const { quantity } = req.body;
  const { packageId } = req.body;
  const { productItemId } = req.body;
  const { kidId } = req.body;
  const accountId = req.user.id;
  let kid;

  if ((kidId == undefined || kidId == null)) kid = null;
  else {
    kid = await models.kid.findOne({
      where: {
        id: kidId,
      },
    });
  }
  // models.kid.findOne({
  //     where:{
  //         id:kidId,
  //         deleteFl:false
  //     }
  // }).then(kid=>{

  // let accountId = kid.parentAccountFk;
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
          var fileName = path.replace(process.env.s3BucketPath, '');
          var fileName = path.replace(process.env.s3BucketPath, '');
          models.basketItem.build({
            path,
            kidFk: (kidId == undefined || kidId == null) ? null : kidId,
            kidName: (kid == null) ? null : kid.name,
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

    // models.card.findOne({
    //     where:
    //     {
    //         kidFk:kidId,
    //     }
    // }).then(card=>{

    //     const path = packageId == 1 ? card.path : card.package2Path;
    //     const cardFileName = packageId == 1 ? card.fileName : card.package2FileName;
    //     const picture = packageId == 1 ? kid.artwork : kid.picture;

    //     models.basketItem.build({
    //         packageFk: req.body.packageId,
    //         quantity: quantity,
    //         kidFk: kidId,
    //         accountFk: accountId,
    //         cost:cost,
    //         path:path,
    //         fileName:cardFileName,
    //         displaySchool:kid.displaySchool,
    //         displayClass:kid.displayClass,
    //         displayAge:kid.displayAge,
    //         picture:picture
    //     }).save().then(()=>{

    //         models.basketItem.findAll({
    //             where:{
    //                 accountFk:accountId,
    //                 purchaseBasketFk:null
    //             }
    //         }).then(basketItems=>{

    //             models.sequelize.query('select * from basketitems b ' +
    //             ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
    //             ' where b.accountFk = :accountId ' +
    //             ' and pb.status = :pending' , {replacements:{
    //              accountId: accountId, pending:'Pending'
    //                  }, type: models.sequelize.QueryTypes.SELECT
    //              }).then(basketItems2=>{
    //                 var subTotal = 0;
    //                 basketItems.forEach(basketItem=>{
    //                     subTotal = subTotal + parseFloat(basketItem.cost);
    //                 })

    //                 basketItems2.forEach(baskeItem2=>{
    //                     subTotal = subTotal + parseFloat(baskeItem2.cost);
    //                 })

    //                 let numberOfBasketItems = basketItems.length + basketItems2.length;
    //                 res.json({numberOfBasketItems:numberOfBasketItems, subTotal:subTotal.toFixed(2)});
    //              })

    //         })
    //      })
    //     })
  });

  // })
};

exports.addToBasket = function (req, res) {
  const { quantity } = req.body;
  const { kidId } = req.body;
  const { packageId } = req.body;

  models.kid.findOne({
    where: {
      id: kidId,
      deleteFl: false,
    },
  }).then((kid) => {
    const accountId = req.user.id;

    models.package.findOne({
      where: {
        id: packageId,
      },
    }).then((p) => {
      const cost = parseInt(quantity, 10) * parseFloat(p.price);
      if (packageId == 3) {
        let path;
        const { color } = req.body;
        const { orientation } = req.body;
        models.calendar.findOne({
          where: {
            kidFk: kidId,
          },
        }).then(async (calendar) => {
          if (orientation == 'portrait') {
            if (color == 'red') {
              path = calendar.portraitRedPath;
            } else if (color == 'green') {
              path = calendar.portraitGreenPath;
            } else {
              path = calendar.portraitBluePath;
            }
          } else if (color == 'red') {
            path = calendar.landscapeRedPath;
          } else if (color == 'green') {
            path = calendar.landscapeGreenPath;
          } else {
            path = calendar.landscapeBluePath;
          }

          const fileName = path.replace(process.env.s3BucketPath, '');
          await models.basketItem.create({
            path,
            kidFk: kidId,
            kidName: kid.name,
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
        }).then(async (card) => {
          const path = packageId == 1 ? card.path : card.package2Path;
          const cardFileName = packageId == 1 ? card.fileName : card.package2FileName;
          const picture = packageId == 1 ? kid.artwork : kid.picture;

          await models.basketItem.create({
            packageFk: req.body.packageId,
            quantity,
            kidFk: kidId,
            kidName: kid.name,
            accountFk: accountId,
            cost,
            path,
            fileName: cardFileName,
            displaySchool: kid.displaySchool,
            displayClass: kid.displayClass,
            displayAge: kid.displayAge,
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
};

exports.linkKid = async function (req, res) {
  const account = req.user;
  const { month } = req.query;
  const { age } = req.query;
  const { name } = req.query;
  const { code } = req.query;
  let { basket } = req.query;
  basket = (basket == true) ? 'true' : 'false';
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

      models.sequelize.query('select * from basketitems b '
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
          basket,
        });
      });
    });
  });
};

exports.loadScreen = function (req, res) {
  loadScreen(req, res);
};

exports.unlinkKids = function (req, res) {
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
};

exports.linkKids = function (req, res) {
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
    if (kid == null) {
      errors.errors = 'No kid with these details, please make sure to enter the information correctly and please try again.';
      res.json({ errors });
    } else if (kid.parentAccountFk != null) {
      errors.errors = 'This kid has already been linked to an account.';
      res.json({ errors });
    } else {
      models.kid.update({
        parentAccountFk: (accountLinkedByAdmin) == '' ? req.user.id : accountLinkedByAdmin,
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
};

exports.viewEditCard = async function (req, res) {
  const cardArray = await models.sequelize.query(' select  c.* from cards c inner join kids k on c.kidFk = k.id '
    + ' where k.parentAccountFk = :accountId '
    + ' and k.deleteFl = false ', {
    replacements: {
      accountId: req.user.id,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((result) => result);

  viewCards(cardArray, req, res, 'viewCards');
};

const getYears = async function () {
  const date = new Date();
  const currentYear = date.getFullYear();
  // console.log(currentYear);
  return models.year.findOne({
    where: {
      year: currentYear,
    },
  }).then(async (year) => {
    if (year === null) {
      const newYear = models.year.build({
        year: currentYear,
      });

      return newYear.save().then(() => getAllYears());
    }

    return getAllYears();
  });
};

const getAllYears = function () {
  return models.year.findAll().then((years) => {
    const array = new Array();

    years.forEach((year) => {
      array.push(year.dataValues);
    });

    return array;
  });
};

const viewKidAdmin = function () {

};

const viewCards = async function (cards, req, res, pageToRender) {
  const schools = await models.school.findAll({
    order: [
      ['name', 'ASC'],
    ],
  }).then(async (results) => {
    const array = new Array();

    results.forEach((result) => {
      array.push(result.dataValues);
    });

    return array;
  });

  let years = await getYears();
  years = await Promise.all(years);

  const selectedCard = cards[0];

  const schoolKidArray = await models.sequelize.query('select s.id as schoolId, k.* from cards c inner join kids k on c.kidFk = k.id '
                        + ' inner join classes cl on k.classFk = cl.id '
                        + ' inner join schools s on cl.schoolFk = s.id '
                        + ' where c.id = :selectedCardId '
                        + ' and k.deleteFl = false ', {
    replacements: {
      selectedCardId: selectedCard.id,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((result) => result = result[0]);

  const classes = await models.class.findAll({
    where: {
      schoolFk: schoolKidArray.schoolId,
    },
    order: [
      ['name', 'ASC'],
    ],
  }).then((results) => {
    const array = new Array();

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
    cards,
    schools,
    reece: classes,
    schoolKidArray,
    numberOfBasketItems: req.user.accountTypeFk == 2 ? numberOfBasketItems : null,
    packages,
  });
};

exports.basket = async function (req, res) {
  const account = req.user;
  models.sequelize.query('select b.*, b.path, p.price, p.name as packageName '
    + ' from basketItems b '
    // ' inner join kids k on b.kidFk = k.id ' +
    + ' inner join packages p on b.packageFk = p.id '
    // ' inner join cards c on c.kidFk = k.id ' +
    // ' inner join classes cl on k.classFk = cl.id ' +
    // ' inner join schools s on cl.schoolFk = s.id ' +
    + ' where b.accountFk = :accountId '
    + ' and purchaseBasketFk is null ', {
    replacements: {
      accountId: account.id,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((basketItemsArray) => {
    let total = 0;
    basketItemsArray.forEach((b) => {
      total += (b.quantity * b.price);
    });

    models.sequelize.query('select b.*, b.path, p.price, p.name as packageName '
    + ' from basketItems b '
    // ' inner join kids k on b.kidFk = k.id ' +
    + ' inner join packages p on b.packageFk = p.id '
    // ' inner join cards c on c.kidFk = k.id ' +
    // ' inner join classes cl on k.classFk = cl.id ' +
    // ' inner join schools s on cl.schoolFk = s.id ' +
    + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
    + ' where b.accountFk = :accountId '
    + ' and pb.status = :pending ', {
      replacements: {
        accountId: account.id, pending: 'Pending',
      },
      type: models.sequelize.QueryTypes.SELECT,
    }).then(async (basketItemsArray2) => {
      basketItemsArray2.forEach((b) => {
        total += (b.quantity * b.price);

        basketItemsArray.push(b);
      });

      const allLinkedKidsForAccount = await models.kid.findAll({
        where: {
          parentAccountFk: req.user.id,
        },
      });

      const displayParentSection = (allLinkedKidsForAccount.length == 0) ? 'false' : 'true';

      const shippingAddress = await models.shippingAddress.findOne({
        where: {
          accountFk: req.user.id,
        },
      });
      const displayShippingSection = await isDisplayShippingSection(req);
      // in order
      // dont show shipping section if there is a linked school whose deadline has not passed and is not a create your own card
      // otherwise if deadline has passed or the basket doesnt contain any kids who dont go to individual

      models.sequelize.query('select * from deliveryCosts order by id asc', { type: models.sequelize.QueryTypes.SELECT }).then((deliveryCosts) => {
        let preTotal;

        let deliveryCost = 0;
        let delivery;

        if (displayShippingSection) {
          preTotal = total;
          deliveryCost = parseFloat(deliveryCosts[1].cost);
          delivery = deliveryCosts[1];
        }

        console.log(displayShippingSection);
        console.log(deliveryCost);
        total += deliveryCost;
        const countriesArray = new Array();

        models.country.findOne({
          where: {
            name: 'United Kingdom',
          },
        }).then((country) => {
          countriesArray.push(country);
          models.sequelize.query(
            'select * from countries where id != :id ',
            { replacements: { id: country.id }, type: models.sequelize.QueryTypes.SELECT },
          ).then((countries) => {
            if (displayShippingSection) {
              countries.forEach((c) => {
                countriesArray.push(c);
              });
            }

            if (shippingAddress != 0) {
              res.render('basket2', {
                user: req.user,
                preTotal,
                total,
                delivery,
                deliveryCost,
                basketItems: basketItemsArray,
                numberOfBasketItems: basketItemsArray.length,
                displayParentSection,
                shipping: shippingAddress, /* passedDeadline:passedDeadline,onlyCreateYourOwnCard:onlyCreateYourOwnCard, */
                displayShippingSection,
                countries: countriesArray,
              });
            } else {
              res.render('basket2', {
                user: req.user,
                preTotal,
                total,
                delivery,
                deliveryCost,
                basketItems: basketItemsArray,
                numberOfBasketItems: basketItemsArray.length,
                displayParentSection,
                /* passedDeadline:passedDeadline, onlyCreateYourOwnCard:onlyCreateYourOwnCard, */
                displayShippingSection,
                countries: countriesArray,
              });
            }
          });
        });

        // })

        // })
      });
    });
  });
};

const isDisplayShippingSection = async function (req) {
  // find a linked school to account whose deadline has not passed
  const schools = await models.sequelize.query('select distinct sc.id from kids k '
                    + ' inner join classes c on k.classFk = c.id '
                    + ' inner join schools sc on c.schoolFk = sc.id '
                    + ' where c.name != :cName '
                    + ' and k.parentAccountFk = :accountId ', {
    replacements: { cName: 'Individual Class', accountId: req.user.id },
    type: models.sequelize.QueryTypes.SELECT,
  });
  if (schools.length == 0) {
    // display shipping
    return true;
  }

  const schoolIds = new Array();
  schools.forEach((school) => {
    schoolIds.push(school.id);
  });
  let schoolsWithPassedDeadlines = await models.sequelize.query(' select count(s.id) as count from statuses s '
                            + ' inner join schools sc on s.schoolFk = sc.id '
                            + ' inner join statusTypes st on s.statusTypeFk = st.id '
                            + ' where st.type = :type '
                            + ' and sc.id in (:schools) ', { replacements: { schools: schoolIds, type: 'Printing' }, type: models.Sequelize.QueryTypes.SELECT });
  schoolsWithPassedDeadlines = schoolsWithPassedDeadlines[0].count;

  if (schoolsWithPassedDeadlines == 0) {
    // dont display shipping
    return false;
  }

  // display shipping
  return true;
};

exports.print = async function (req, res) {
  let path;

  if (req.query.path == undefined && req.query.samplePath == undefined) {
    // add column to class table with sample/ proof pdf path maybe foreign key
    // same sample name as the first if present save space

    const { classId } = req.query;
    const { className } = req.query;
    const sampleArray = await models.sequelize.query(
      'select cd.samplePath, cd.sampleFileName from cards cd  '
        + ' inner join kids k on cd.kidFk = k.id '
        + ' inner join classes c on k.classFk = c.id '
        + ' where c.id = :classId '
        + ' and k.deleteFl = false ',
      {
        replacements: {
          classId,
        },
        type: models.sequelize.QueryTypes.SELECT,
      },
    );

    // put check that sampleArray has length greater than zero
    const s3 = new aws.S3();
    const params = {
      Bucket: process.env.bucketName,
    };

    let files = new Array();
    const now = Date.now();
    files = await asyncForEachDownload(sampleArray, downloadProofFiles, params, files, s3);

    const proofBuffer = await PDFMerge(files, { output: `${process.cwd()}/tmp/${now}_proof.pdf` });

    files.forEach((file) => {
      fs.unlink(file);
    });

    // save proof to s3

    params.Key = 'Proofs' + `/${className}${now}_proof.pdf`;
    params.ACL = 'public-read';
    params.Body = proofBuffer;

    const s3UploadPromise = new Promise((resolve, reject) => {
      s3.upload(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    await s3UploadPromise;

    fs.unlink(`${process.cwd()}/tmp/${now}_proof.pdf`);

    path = process.env.s3BucketPath + params.Key;
    models.class.update(
      { proofPath: path },
      {
        where: {
          id: classId,
        },
      },
    ).then(() => {
      res.json({ samplePath: path });
    });
  } else {
    path = req.query.path ? req.query.path : req.query.samplePath;
    //   res.json({samplePath:path});
    res.render('printScreen', { user: req.user, samplePath: path });
  }
};

exports.getBasketItems = function (req, res) {
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
};

exports.updateBasketItemQuantity = async function (req, res) {
  const { newQuantity } = req.body;
  const { basketItemId } = req.body;

  return await models.basketItem.findOne({
    where: {
      id: basketItemId,
    },
  }).then(async (basketItem) => await models.package.findOne({
    where: {
      id: basketItem.packageFk,
    },
  }).then(async (p) => {
    const newCost = newQuantity * (parseFloat(p.price));

    return await models.basketItem.update({
      quantity: newQuantity,
      cost: newCost,
    }, {
      where: {
        id: basketItemId,
      },
    }).then(() => res.json({ success: 'success' }));
  }));
};

exports.shop = async function (req, res) {
  // get the number of portrait calendars
  // get number of landscape portraits;
  const portraitCount = await getNumberOfCalendarsForOrientation('Portrait');
  const landscapeCount = await getNumberOfCalendarsForOrientation('Landscape');

  let orientation = null;
  const category = req.query.category == undefined ? 'New Card Designs' : req.query.category;
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
      let subTotal = 0;
      basketItems.forEach((basketItem) => {
        subTotal += parseFloat(basketItem.cost);
      });

      basketItems2.forEach((baskeItem2) => {
        subTotal += parseFloat(baskeItem2.cost);
      });
      const numberOfBasketItems = basketItems.length + basketItems2.length;

      if (category == 'Calendars') {
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
};

async function getNumberOfCalendarsForOrientation(orientation) {
  return await models.sequelize.query('select distinct count(p.id) as count from products p '
    + ' inner join productTypes pt on p.productTypeFk = pt.id '
    + ' where pt.type = :calendar'
    + ' and p.orientation = :orientation ', { replacements: { calendar: 'Calendars', orientation }, type: models.sequelize.QueryTypes.SELECT });
}

exports.parentDashboard = function (req, res) {
  parentScreen(req, res, req.user, 'parentDashboard');
};

exports.getOrderHistory = function (req, res) {
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
      let subTotal = 0;
      basketItems.forEach((basketItem) => {
        subTotal += parseFloat(basketItem.cost);
      });

      basketItems2.forEach((baskeItem2) => {
        subTotal += parseFloat(baskeItem2.cost);
      });

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
          // var kidIds = new Array();

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
            const totalDelivery = (cost[0].cost) == null ? 0.00 : (cost[0].cost).toFixed(2);
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
};

exports.getProductItem = function (req, res) {
  const id = req.query.productItemId;

  models.productItem.findOne({
    where: {
      id,
    },
  }).then((productItem) => {
    res.json({ productItem });
  });
};

// exports.productItem = function(req,res)
// {
//     var productId = req.query.productId;
//     var accountId = req.user.id;
//     // change this to include price
//     models.product.findOne({
//         where:{
//             id:productId
//         }
//     }).then(product=>{

//         models.package.findOne({
//             where:{
//                 productTypeFk:product.productTypeFk
//             }
//         }).then(package=>{

//             models.sequelize.query('select pi.* from products p ' +
//             ' inner join productItems pi on pi.productFk = p.id ' +
//             ' where p.id = :productId ' +
//             ' and pi.accountFk = :accountId ', {replacements:{productId:productId,
//                                         accountId:accountId},type:models.sequelize.QueryTypes.SELECT})
//                                         .then(productItem=>{

//                         models.basketItem.findAll({
//                             where:{
//                                 accountFk:accountId,
//                                 purchaseBasketFk:null
//                             }
//                         }).then(basketItems=>{

//                             models.sequelize.query('select * from basketitems b ' +
//                             ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
//                             ' where b.accountFk = :accountId ' +
//                             ' and pb.status = :pending' , {replacements:{
//                              accountId: req.user.id, pending:'Pending'
//                                  }, type: models.sequelize.QueryTypes.SELECT
//                              }).then(async basketItems2=>{

//                                 var subTotal = 0;
//                                 basketItems.forEach(basketItem=>{
//                                     subTotal = subTotal + parseFloat(basketItem.cost);
//                                 })

//                                 basketItems2.forEach(baskeItem2=>{
//                                     subTotal = subTotal + parseFloat(baskeItem2.cost);
//                                 })
//                                 var numberOfBasketItems = basketItems.length + basketItems2.length;

//                                 var kid = await models.kid.findOne({
//                                     where:{
//                                         parentAccountFk:accountId
//                                     }
//                                 });
//                                 if(productItem.length == 0 )
//                                 {
//                                         models.productItem.create({
//                                             productFk:productId,
//                                             pdfPath:product.defaultPdfPath,
//                                             accountFk:accountId
//                                         }).then((newProductItem)=>{

//                                             res.render('productItem', {user:req.user,productItem:newProductItem,
//                                                 product:product,displayParentSection:true, package:package,numberOfBasketItems:numberOfBasketItems, kidId: kid != null ? kid.id : null});
//                                         })

//                                 }
//                                 else
//                                 {
//                                     res.render('productItem', {user:req.user,productItem:productItem[0],
//                                         product:product,displayParentSection:true, package,package,numberOfBasketItems:numberOfBasketItems,kidId:kid != null ? kid.id : null});

//                                 }
//                              })

//                          })
//             })
//         })
//     })
//     // get the type
//     // switch case
//     // create product item if one doesnt exist
//     // other wise return the existing one

// }

exports.validateShippingDetails = async function (req, res) {
  const errors = await validator.validateShippingDetailFields(req);

  res.json({ errors });
};

exports.parentDashboard2 = function (req, res) {
  parentScreen(req, res, req.user, 'parentDashboard2');
};

exports.createProof = async function (req, res) {
  const { kidId } = req.body;

  const schoolYear = await models.sequelize.query(
    'select s.name,s.id, y.year  from classes c '
                                + ' inner join schools s on c.schoolFk = s.id '
                                + ' inner join years y on c.yearFk = y.id '
                                + ' inner join kids k on k.classFk = c.id '
                                + ' where k.id = :kidId',
    { replacements: { kidId }, type: models.sequelize.QueryTypes.SELECT },
  );

  const schoolName = schoolYear[0].name;
  const { year } = schoolYear[0];

  const deadline = await models.deadLine.findOne({
    where: {
      schoolFk: schoolYear[0].id,
    },
  });

  if (deadline == null) {
    res.json({ success: false, errorType: 'deadline' });
  } else {
    models.sequelize.query(
      'select k.*, cd.id as cardId, s.name as schoolName, y.year, c.id as classId, c.name as className, d.deadLineDttm from classes c '
        + ' inner join kids k on k.classFk = c.id '
        + ' inner join cards cd on cd.kidFk = k.id '
        + ' inner join schools s on c.schoolFk  = s.id '
        + ' inner join years y on c.yearFk = y.id '
        + ' inner join deadlines d on d.schoolFk = s.id '
        + ' where k.id = :kidId '
        + ' and k.deleteFl = false ',
      { replacements: { kidId }, type: models.sequelize.QueryTypes.SELECT },
    )
      .then(async (kids) => {
        if (kids.length > 0) {
          const job = await queueController.addProofJob(
            kids,
            kids[0].classId,
            year,
            kids[0].className,
            schoolName,
          );
          res.json({ id: job.id });
        } else {
          res.json({ success: false, errorType: 'cards' });
        }
      });
  }
};

exports.createProofsForClass = async function (req, res) {
  const { classId } = req.body;
  const { className } = req.body;

  const schoolYear = await models.sequelize.query(
    'select s.name,s.id, y.year  from classes c '
                                + ' inner join schools s on c.schoolFk = s.id '
                                + ' inner join years y on c.yearFk = y.id '
                                + ' where c.id = :classId',
    { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
  );

  const schoolName = schoolYear[0].name;
  const { year } = schoolYear[0];

  const deadline = await models.deadLine.findOne({
    where: {
      schoolFk: schoolYear[0].id,
    },
  });

  if (deadline == null) {
    res.json({ success: false, errorType: 'deadline' });
  } else {
    models.sequelize.query(
      'select k.*, cd.id as cardId, s.name as schoolName, y.year, c.name as className, d.deadLineDttm from classes c '
        + ' inner join kids k on k.classFk = c.id '
        + ' inner join cards cd on cd.kidFk = k.id '
        + ' inner join schools s on c.schoolFk  = s.id '
        + ' inner join years y on c.yearFk = y.id '
        + ' inner join deadlines d on d.schoolFk = s.id '
        + ' where c.id = :classId '
        + ' and k.deleteFl = false ',
      { replacements: { classId }, type: models.sequelize.QueryTypes.SELECT },
    )
      .then(async (kids) => {
        if (kids.length > 0) {
          const job = await queueController.addProofJob(kids, classId, year, className, schoolName);
          res.json({ id: job.id });
        } else {
          res.json({ success: false, errorType: 'cards' });
        }
      });
  }
};

exports.getCreateProofJob = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const samplePath = (job.returnvalue == null) ? undefined : job.returnvalue.path;
    const { process } = job.data;

    res.json({
      id, state, progress, reason, samplePath, process,
    });
  }
};

exports.getCreateProofJobs = async function (req, res) {
  const { id } = req.query;
  const job = await queueController.getJobId(id);

  if (job === null) {
    res.status(404).end();
  } else {
    const state = await job.getState();
    const progress = job._progress;
    const reason = job.failedReason;
    const samplePath = (job.returnvalue == null) ? undefined : job.returnvalue.path;
    const { process } = job.data;

    res.json({
      id, state, progress, reason, samplePath, process,
    });
  }
};

const asyncForEachDownload = async function (array, callback, params, files, s3) {
  for (let i = 0; i < array.length; i++) {
    const fileName = await callback(array[i], params, i, s3);
    files.push(fileName);
    console.log(fileName);
  }

  return files;
};

const downloadProofFiles = async function (sampleItem, params, i, s3) {
  const { sampleFileName } = sampleItem;

  params.Key = sampleFileName;
  let file;
  const tempFile = 'tmp' + `/${i}.pdf`;
  const s3DownloadPromise = new Promise((resolve, reject) => {
    file = fs.createWriteStream(tempFile);
    const stream = s3.getObject(params).createReadStream();
    stream.pipe(file);

    stream.on('finish', resolve);
  });

  await s3DownloadPromise;
  console.log(`file ${file}`);
  return `${process.cwd()}/${tempFile}`;
};

exports.cards = function (req, res) {
  parentScreen(req, res, req.user, 'cards');
};

exports.card = async function (req, res) {
  const kidId = req.query.id;
  const cardArray = await models.sequelize.query('select  c.*'
    + ' from kids k '
    + ' inner join cards c on c.kidFk = k.id '
    + ' where k.id = :kidId '
    + ' and k.deleteFl = false ', {
    replacements: {
      kidId,
    },
    type: models.sequelize.QueryTypes.SELECT,
  }).then((card) => card);

  viewCards(cardArray, req, res, 'card');

  //   res.render('card', {user:req.user,result:result});
};

exports.kid = async function (req, res) {
  const kidId = req.query.id;
  let { selectedPackage } = req.query;
  if (selectedPackage == null) selectedPackage = 1;
  models.kid.findOne({
    where:
        {
          id: kidId,
          deleteFl: false,
        },
  }).then((kid) => {
    // now have kid, identify if there has been a card created for this kid
    if (kid == null) {
      res.render('home2', { user: req.user });
    } else if (selectedPackage == 1 || selectedPackage == 2) {
      models.card.findOne({
        where:
                {
                  kidFk: kidId,
                },
      }).then((card) => {
        models.basketItem.findAll({
          where: {
            accountFk: req.user.id,
            purchaseBasketFk: null,
          },
        }).then(async (basketItems) => {
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
            const packages = await dadController.viewPackages2();

            let parentEmail = null;
            if (kid.parentAccountFk != null) {
              parentEmail = await models.account.findOne({
                where: {
                  id: kid.parentAccountFk,
                },
              }).then((account) => account.email);
            }

            models.sequelize.query(
              'select distinct k.*, kh.* from kids k '
                                                + ' inner join classes c on k.classFk = c.id '
                                                + ' inner join schools s on c.schoolFk = s.id '
                                                + ' inner join basketitems b on b.kidFk = k.id '
                                                + ' inner join kidorderhistories kh on kh.kidFk = k.id '
                                                + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
                                                + ' where k.id = :kidId '
                                                + ' and k.deleteFl = false '
                                                + ' and kh.accountFk = b.accountFk '
                                                + ' and pb.status = :completed ',
              { replacements: { kidId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
            ).then((kidOrders) => {
              models.kid.findOne({
                where: {
                  parentAccountFk: req.user.id,
                },
              }).then((kid1) => {
                models.sequelize.query('select s.* from kids k '
                                                            + ' inner join classes c on k.classFk = c.id '
                                                            + ' inner join schools s on c.schoolFk = s.id '
                                                            + ' where k.id = :kidId', { replacements: { kidId: kid.id }, type: models.sequelize.QueryTypes.SELECT })
                  .then((school) => {
                    school = school[0];
                    const isCreateYourOwnCard = (school.name == 'Individuals');
                    const displayParentSection = kid1 != null;

                    res.render('kid2', {
                      user: req.user,
                      card,
                      kid,
                      parentEmail,
                      kidOrders,
                      numberOfBasketItems: (req.user.accountTypeFk == 2 || req.user.accountTypeFk == 3) ? numberOfBasketItems : null,
                      packages,
                      displayParentSection,
                      selectedPackage,
                      isCreateYourOwnCard,
                    });
                  });
              });
            });
          });
        });

        // need to extract to a method
      });
    } else {
      // calendar
      let { orientation } = req.query;
      let { color } = req.query;

      orientation = orientation == undefined ? 'landscape' : orientation;
      color = color == undefined ? 'green' : color;
      models.basketItem.findAll({
        where: {
          accountFk: req.user.id,
          purchaseBasketFk: null,
        },
      }).then(async (basketItems) => {
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
          const packages = await dadController.viewPackages2();

          models.kid.findOne({
            where: {
              parentAccountFk: req.user.id,
            },
          }).then((kid1) => {
            models.calendar.findOne({

              where: {
                kidFk: kidId,
              },
            }).then((calendar) => {
              models.sequelize.query('select s.* from kids k '
                                                            + ' inner join classes c on k.classFk = c.id '
                                                            + ' inner join schools s on c.schoolFk = s.id '
                                                            + ' where k.id = :kidId', { replacements: { kidId: kid.id }, type: models.sequelize.QueryTypes.SELECT })
                .then((school) => {
                  school = school[0];
                  const isCreateYourOwnCard = !!((school.name = 'Individuals'));
                  var displayParentSection = kid1 != null;

                  var displayParentSection = kid1 != null;
                  res.render('kid2', {
                    user: req.user,
                    kid,
                    displayParentSection,
                    calendar: calendar.dataValues.id,
                    calendarPicture: calendar.dataValues.calendarPicture,
                    numberOfBasketItems,
                    packages,
                    selectedPackage,
                    color,
                    orientation,
                    isCreateYourOwnCard,
                  });
                });
            });
          });
        });
      });
    }
  });
};

exports.getPackageWithId = async function (req, res) {
  const { packageId } = req.query;

  return await models.package.findOne({
    where: {
      id: packageId,
    },
  }).then((p) => res.json({ package: p }));
};

exports.printForm = async function (req, res) {
  const filename = 'reece.pdf';
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  const page = await browser.newPage();
  const basketItems = new Array();
  basketItems.push({ cardPath: `${process.env.s3BucketPath}Packages/package2.jpg` });
  const data = { basketItems };
  const content = await compile('printForm', data);
  await page.setContent(content);

  const buffer = await page.pdf({
    path: filename,
    printBackground: true,
    format: 'A4',
  });

  browser.close();

  res.json({});
};

exports.removeBasketItem = function (req, res) {
  const { basketItemId } = req.body;

  models.basketItem.destroy({
    where: {
      id: basketItemId,
    },
  }).then(() => {
    res.json({ success: 'success' });
  });
};

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

exports.hasBeenModified = async (req, res) => {
  const { kidId } = req.query;

  const kid = await models.kid.findOne({
    where: {
      id: kidId,
    },
  });

  const { name } = kid;
  const { artwork } = kid;

  if (name == 'John Doe' || artwork == 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Artwork/Default/goesHere.png?versionId=on3S9HuQzOw9ODk7DAJZXu289axUWjeL'
        || artwork == 'https://kidscards4christmas.s3.eu-west-2.amazonaws.com/Artwork/Default/goesHere.png') res.json({ error: 'error' });
  else res.json({});
};

exports.updateFirstLogin = function (req, res) {
  const { user } = req;

  if (user.firstLoginFl == true) {
    // update
    models.account.update({
      firstLoginFl: false,
    }, {
      where: {
        id: user.id,
      },
    }).then(() => {
      res.json({});
    });
  } else res.json({});
};
