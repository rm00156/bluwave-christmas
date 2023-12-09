let throng = require('throng');
let Queue = require("bull");
const path = require('path');
const notProduction = process.env.NODE_ENV != 'production';
if(notProduction) {
  require('dotenv').config();
}
const fs = require('fs-extra');
const moment = require('moment');
// const process.env = require('./process.env/process.env.json');
let models = require('./models');
const aws = require('aws-sdk');
const puppeteer = require('puppeteer');
const hbs = require('handlebars');
const PDFMerge = require('pdf-merge');
const nodeMailer = require('nodemailer');
// Connect to a local redis intance locally, and the Heroku-provided URL in production
let REDIS_URL = /*process.env.REDIS_URL*/ process.env.STACKHERO_REDIS_URL_TLS || "redis://127.0.0.1:6379";
const env = process.env.NODE_ENV || "development";
const urlPrefix = env == 'development' ? 'http://localhost:4000' : process.env.website;
const productController = require('./controllers/ProductController.js');
const kidController = require('./controllers/KidController.js');
const classController = require('./controllers/ClassController.js');
const orderController = require('./controllers/OrderController.js');

const schoolUtility = require('./utility/school/schoolUtility.js');
const productItemUtility = require('./utility/product/productItemUtility.js');
const testEmail = 'rmillermcpherson4@gmail.com';
const STATUS_TYPES = require('./utility/school/statusTypes.js');
const redis = require('redis');
// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
let workers = process.env.WEB_CONCURRENCY || 2;

// The maxium number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network 
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
let maxJobsPerWorker = 15;

const redisUrlParse = require('redis-url-parse');
const redisUrlParsed = redisUrlParse(REDIS_URL);
const { host, port, password } = redisUrlParsed;
const client = REDIS_URL.includes('rediss://')
  ? {
      redis: {
        port: Number(port),
        host,
        password,
        tls: {
          rejectUnauthorized: false,
        },
      },
    }
  : REDIS_URL;


aws.config.update({
    secretAccessKey: process.env.secretAccessKey,
    accessKeyId:process.env.accessKeyId,
    region: process.env.region
  });

  const compile = async function(templateName, data)
  {
    const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
    const html = await fs.readFile(filePath,'utf-8');
  
    return hbs.compile(html)(data);
  }
  
  hbs.registerHelper('dateFormat', (value,format)=>{
    console.log('formatting', value, format);
    return moment(value).format(format);
  });

const start = function() {
  // Connect to the named work queue

var workerQueue = new Queue('worker', client );

workerQueue.process(maxJobsPerWorker, async (job) => {

  if(job.data.process == 'proof')
  {
    var path = await createProofs(job.data.kids,
      job.data.classId,
      job.data.year,job.data.className,
      job.data.schoolName,
      job);

    return {path:path};
  }
  else if( job.data.process == 'artworkPic')
  {
    await updateCardArtworkAndPicture(job.data.files,job.data.kidId,job.data.name,
      job.data.age,job.data.displaySchool,job.data.displayClass,job.data.displayAge,job.data.month, job);
    return;
  }
  else if( job.data.process == 'createCards')
  {
    await createCards(job);
  }
  else if( job.data.process == 'form')
  {
    var form = await generatePrintForm(job.data.classId,job.data.purchasedCardDetails,job.data.numberOfPurchasedItems,job.data.purchasedExtras,job);

    return {form:form};
  }
  else if( job.data.process == 'createCardAdmin')
  {
    await createCardAdmin(job.data.kidId, job);
      return;
  }
  else if ( job.data.process == 'updateCard')
  {
    await updateCard( job.data.classFk,job.data.kidId,
      job.data.age,job.data.name,job.data.displaySchool,
      job.data.displayClass,job.data.displayAge,job.data.files, job);

      return;
  }
  else if( job.data.process == 'purchasedCards')
  {
    var path = await generatePurchasedCards(job.data.purchasedBasketItems,job.data.classId, job);
    return {path:path};
  }
  else if( job.data.process == 'parentRegistrationEmail')
  {
    await  sendParentRegistrationEmail(job.data.email,job);
  }
  else if( job.data.process == 'organiserRegistrationEmail')
  {
    await sendOrganiserRegistrationEmail(job.data.email,job.data.school,job.data.name, job)
  }
  else if( job.data.process == 'parentRegistrationEmailToBluwave')
  {
    await  sendParentRegistrationEmailToBluwave(job.data.email,job.data.name,job.data.telephoneNo,job);
  }
  else if( job.data.process == 'organiserRegistrationEmailToBluwave')
  {
    console.log('reece');
    await  sendOrganiserRegistrationEmailToBluwave(job.data.school,job.data.name,job.data.account, job.data.numberOfClasses, job);
  }
  else if( job.data.process == 'purchaseEmail' || job.data.process == 'purchaseEmailToBluwave')
  {
    if(job.data.process == 'purchaseEmail')
      await sendPurchaseEmail(false, job.data.basketItems,job.data.orderNumber,job.data.date,job.data.total, job.data.time,job);
    else
      await sendPurchaseEmail(true, job.data.basketItems,job.data.orderNumber,job.data.date,job.data.total,job.data.time,job);

  }
  else if( job.data.process == 'updateCalendar' )
  {
    await updateCalendar(job.data.calendarId, job);
  }
  else if(job.data.process == 'deadline')
  {
    await deadlineRecurringTask();
  }
  else if(job.data.process == 'delay')
  {
    await delayRecurringTask();
  }
  else if( job.data.process == 'charity')
  {
    await charity();
  }
  else if( job.data.process == 'noDeadlineResponse')
  {
    await noDeadlineResponse();
  }
  else if( job.data.process == 'sendConfirmDetailsEmail' )
  {
    await sendConfirmDetailsEmail(job.data.school,job.data.name,job.data.bankAcc,job.data.sortCode,job.data.type);
  }
  else if( job.data.process == 'resetEmail' )
  {
     await sendResetEmail(job.data.email,job);
  }
  else if(job.data.process == 'parent3DaysToDeadline')
  {
     await parent3DaysToDeadline();
  }
  else if(job.data.process == 'parent1DayToDeadline')
  {
    await parent1DayToDeadline();
  }
  else if(job.data.process == 'noPurchaseMadeSinceSignUp')
  {
    await noPurchaseMadeSinceSignUp();
  }
  else if(job.data.process == 'test')
  {
    await test();
  }
  else if(job.data.process =='testTrial')
  {
    await testTrial(job.data.x,job.data.y,job.data.width, job.data.height,job.data.name,job.data.nameX,job.data.nameY,
    job.data.nameHeight,job.data.nameWidth);
  }
  else if(job.data.process == 'updateProductItem')
  {
    // console.log('hello we made ite');
    await updateProductItem(job.data.productItemId, job);
  }
  else if(job.data.process == 'uploadAndGenerate')
  {
    await uploadAndGenerate(job.data.productItemId, job.data.pictureNumber, job.data.productId, job.data.files, job);
  }
  else if(job.data.process == 'updateAndGenerate')
  {
    await updateAndGenerate(job.data.productItemId, job.data.productId, job.data.name,
      job.data.age, job.data.month, job.data.displaySchool, job.data.displayClass, job.data.displayAge, job);
  }
  else if(job.data.process == 'generateProductItemForKid')
  {
    return await productController.generateProductItemForKid(job.data.kid, job.data.productId, job.data.dummy, job.data.isAccountLinkedToASchoolInScheme)
  }
  else if(job.data.process == 'classOrderInstruction')
  {
    var progress = 1;
    job.progress(progress);
    return await classController.processClassOrderInstruction(job.data.classId, job.data.deadlineId, progress, 1, job);
  }
  else if(job.data.process == 'schoolOrderInstruction')
  {
    return await classController.processSchoolOrderInstruction(job.data.schoolId, job);
  }
  else if(job.data.process == 'ordersForm')
  {
    console.log('core')
    return await classController.generatePrintForm(job.data.classId, job);
  }
  else if(job.data.process == 'purchasedOrders')
  {
    return await classController.generateOrdersPdf(job.data.classId, job);
  }
  else if(job.data.process == 'generateOrderDetails')
  {
    return await orderController.getOrderDetailsGroupByTypeForId(job.data.purchaseBasketId, job);
  }
  else if(job.data.process == 'linkKid')
  {
    return await kidController.handleLinkKid(job.data.name, job.data.years, job.data.months, job.data.classId, job.data.account, job);
  }
  else if(job.data.process == 'ordersNotShippedReminder')
  {
    await sendOrdersNotShippedReminder();
  }
  else if(job.data.process == 'schoolArtworkPacksNotSentReminder')
  {
    await sendSchoolArtworkPacksNotSentReminder();
  }
  else if(job.data.process == 'schoolReadyForPrintingReminder')
  {
    await sendSchoolReadyForPrintingReminder();
  }
  else if(job.data.process == 'charityAmountConfirmed')
  {
    await sendCharityAmountConfirmedSendToSchoolReminder();
  }
  
}).catch(err=>{

  console.log(err);
});
}

async function updateAndGenerate(productItemId, productId, name, age, month, displaySchool, displayClass, displayAge, job)
{
  var progress = 1;
  job.progress(progress);

  var productItem = await productItemUtility.getProductItemById(productItemId);
  var productItems; 
  var kidId = productItem.kidFk;
  var kid = null;
  if(kidId != null) {
    await models.kid.update({
      name: name,
      age: age,
      month: month,
      versionNo: models.sequelize.literal('versionNo + 1') 
    },{
      where:{
        id: kidId
      }
    });

    kid = await kidController.getKidById(kidId);
    productItems = await productController.getProductItemsWithProductForKid(productId, kidId);
  } else {
    productItems = await productController.getProductItemsWithProductForAccountAndNotWithKid(productId, productItem.accountFk);
  }
  progress++;
  job.progress(progress);
  console.log('REEECE')
  for(var i = 0; i < productItems.length; i++) {
    var item = productItems[i];
    await models.productItem.update({
      text1: name,
      text2: age,
      text3: month,
      displayItem1: displaySchool,
      displayItem2: displayClass,
      displayItem3: displayAge,
      versionNo: models.sequelize.literal('versionNo + 1') 
    },{
      where:{
        id: item.id
      }
    });
  }
  
  progress++;
  job.progress(progress);

  console.log('ZITA')
  await productController.generateUpdateProductItem(kid, productId, productItem.accountFk);
  console.log('ALYSSA')

  progress++;
  job.progress(progress);

  return;
}

async function uploadAndGenerate(productItemId, pictureNumber, productId, files, job)
{   
    var progress = 1;
    job.progress(progress);
    
    var blob = await Buffer.from(files.blob.data);

    var fileName = await models.uploadFileName.create();
    fileName = fileName.id;

    progress++;
    job.progress(progress);

    var date = Date.now();
    var suffix = 'jpeg';
    var s3PicturePath = process.env.s3BucketPath + "Pictures/" + date + '_' + fileName + '.' + suffix;
    
    const s3 = new aws.S3();
    var params = {
    Bucket:process.env.bucketName,
    Body: blob,
    Key: 'Pictures/' + date + '_' + fileName + '.' + suffix,
    ACL:'public-read'
    };
    
    var s3UploadPromise = new Promise(function(resolve, reject) {
        s3.upload(params, function(err, data) {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
    
    await s3UploadPromise;

    progress++;
    job.progress(progress);

    // uploaded cropped image
    var productItem = await productItemUtility.getProductItemById(productItemId);
    var kidId = productItem.kidFk;
    var accountId = productItem.accountFk;
    var existingProductItems = await productController.getProductItemsWithProductForAccount(productId, productItem.accountFk, kidId);
    
    progress++;
    job.progress(progress);

    var data = {};
    data['picture' + pictureNumber +'Path'] = s3PicturePath;
    
    // edit the picture for the productitem to the new value
    // existingProductItems.forEach(async existingProductItem => {
    for(var i = 0; i < existingProductItems.length; i++)
    {
      var existingProductItem = existingProductItems[i];
      await models.productItem.update(data,
      {
          where:{
              id:existingProductItem.id
          }
      });
    }
    // })

    progress++;
    job.progress(progress);
    
    // regenerate the productitems pdf and update the value
    var kid = await kidController.getKidById(kidId);
    await productController.generateUpdateProductItem(kid, productId, accountId);
    

    progress++;
    job.progress(progress);

    return;
}


async function updateProductItem(productItemId, job)
{
  var progress = 1;
  job.progress(progress);
  return models.sequelize.query('select pi.id, p.id as productId, pi.accountFk, pt.type, p.template, pi.picture, p.width,p.height from productItems pi  ' + 
      ' inner join products p on pi.productFk = p.id ' + 
      ' inner join productTypes pt on p.productTypeFk = pt.id ' +
      ' where pi.id = :productItemId ', {replacements:{productItemId:productItemId},type:models.sequelize.QueryTypes.SELECT})
      .then(result=>{
        var productItemInfo = result[0];
        models.product.findOne({
          where:{
            id:productItemInfo.productId
          }
        }).then(async product=>{

            productItemInfo['artwork'] = product.imagePath;
        // console.log(productItemInfo);
        return await createProductItemPdf(productItemInfo, job, progress);
        })



      });
}

async function createProductItemPdf(productItemInfo, job,progress)
{

    var data = {picture:productItemInfo.picture, artwork:productItemInfo.artwork};
    const browser = await puppeteer.launch({
      'args' : [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    var template = productItemInfo.template;
    var height = productItemInfo.height;
    var width = productItemInfo.width;

    const page = await browser.newPage();
    progress++;
    job.progress(progress);

    const content = await compile(template, data);
    progress++;
    job.progress(progress);

    await page.setContent(content);
    progress++;
    job.progress(progress)

    var buffer = await page.pdf({
      printBackground:true,
      width:width + "cm",
      height:height + "cm" 
    });

    progress++;
    job.progress(progress);
    await browser.close();

    progress++;
    job.progress(progress);
    // console.log(buffer);
    var now = Date.now();
    var fileLocation = "ProductItem/" +  productItemInfo.type + "/" +  productItemInfo.accountFk + "/";
    var filename =  productItemInfo.accountFk + "_" + now + ".pdf";
    var s3FileLocation =  fileLocation + filename;
    await uploadToS3( buffer, s3FileLocation );

    progress++;
    job.progress(progress);

    return models.productItem.update({
      pdfPath:process.env.s3BucketPath + s3FileLocation
    },{
      where:{
        id:productItemInfo.id
      }
    }).then(()=>{

      progress++;
      job.progress(progress);
      return [job,progress];
    })
    
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function forEachNoPurchaseMadeAccount(array, callback)
{
  for( var i = 0 ; i < array.length; i++)
  {
    await callback(array[i]);
    await delay(5000);
  }
}

async function noPurchaseMadeSinceSignUp()
{
   models.sequelize.query('select distinct a2.* from accounts a2 ' + 
            ' where a2.id not in (select a.id from accounts a ' +
            ' inner join basketitems b on b.accountfk = a.id ' +
            ' inner join purchasebaskets pb on b.purchasebasketfk = pb.id ' + 
            ' where pb.status= :completed ) and a2.accountTypeFk = 2 ' +
            ' and a2.id not in (select accountFk from emails where emailTypeFk = 19) ',
            {replacements:{completed:'Completed'}, type:models.sequelize.QueryTypes.SELECT})
            .then(  async result=>{

              await forEachNoPurchaseMadeAccount(result, sendNoPurchaseMadeSinceSignUp);
            })
}

async function sendNoPurchaseMadeSinceSignUp(account)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  var data = {name:(account.name == null ? '' : account.name)};
  const content = await compile('noPurchaseSinceSignUp', data);
  var mailOptions = {
    from:process.env.mailServer_email,
    to: env == 'development' ? testEmail: account.email,
    subject:'School Project - Buy your kids cards here',
    html: content
    }

    smtpTransport.sendMail(mailOptions,function(errors,res){
      
        createEmail('Noticed No Purchase After Sign Up',errors,account.id);
        console.log(errors);
      
    })
}

async function parent1DayToDeadline()
{

  models.sequelize.query('select distinct a2.*, d.deadLineDttm, s.name from accounts a2 ' +
  ' inner join schools s on s.organiserAccountFk = a2.id ' +
  ' inner join deadlines d on d.schoolFk = s.id ' +
  ' where a2.id not in (select distinct e.accountFk from emails e where e.emailTypeFk = 15 and e.status= :status) ' +
  ' and subdate(d.deadLineDttm , 1 ) <= current_date()   ',
  {replacements:{ status:'Success'},type:models.sequelize.QueryTypes.SELECT})
  .then( async results=>{

    await forEachDayReminder(results,oneDayReminder);
    //console.log('result ' + result);
  })
}

async function parent3DaysToDeadline()
{

  var results = await models.sequelize.query('select distinct a2.*, d.deadLineDttm, s.name from accounts a2 ' +
      ' inner join schools s on s.organiserAccountFk = a2.id ' +
      ' inner join deadlines d on d.schoolFk = s.id ' +
      ' where a2.id not in (select distinct e.accountFk from emails e where e.emailTypeFk = 15 and e.status= :status) ' +
      ' and subdate(d.deadLineDttm , 3 ) <= current_date()  ',
    {replacements:{status:'Success'},type:models.sequelize.QueryTypes.SELECT})
  

  await forEachDayReminder(results,threeDayReminder);
 
}

async function forEachDayReminder(array,callback)
{
   for(var i = 0 ; i < array.length; i++ )
   {
     await callback(array[i]);
   }
}

async function threeDayReminder(account)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  var days = "3 days"
  var data = {name:(account.name == null ? '' : account.name),days};
  const content = await compile('dayReminder', data);

  var mailOptions = {
    from:process.env.mailServer_email,
    to: env == 'development' ? testEmail : account.email,
    subject:'3 Days till purchase deadline',
    html: content
    }

    smtpTransport.sendMail(mailOptions,function(errors,res){
      
        createEmail('Parent 3 days to Deadline Reminder',errors,account.id);
        console.log(errors);
        // console.log(res);
      
    })
}

async function oneDayReminder(account)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  var days = "1 day"
  var data = {name:(account.name == null ? '' : account.name),days};
  const content = await compile('dayReminder', data);

  var mailOptions = {
    from:process.env.mailServer_email,
    to: env == 'development' ? testEmail : account.email,
    subject:'1 Day till purchase deadline',
    html: content
    }

    smtpTransport.sendMail(mailOptions,function(errors,res){
      
        createEmail('Parent 1 day to Deadline Reminder',errors,account.id);
        console.log(errors);
        // console.log(res);
      
    })
}

async function sendResetEmail(email,job)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });
  models.resetEmail.findOne({
    where:{
      email:email
    }
  }).then(async resetEmail=>{
      
    var now = Date.now();
    var hourLater = now + 60*60*1000;
    var link = urlPrefix + '/reset?from=' +now +'&to='+hourLater+'&email='+email;
    var data = {now:now,hourLater:hourLater,link:link};
    
    const content = await compile('resetEmail', data);

    if(resetEmail == null)
    {
      models.resetEmail.create({
        fromDttm:now,
        toDttm:hourLater,
        email:email,
        usedFl:false,
        deleteFl:false,
        versionNo:1
      }).then(()=>{

        var mailOptions = {
          from:process.env.mailServer_email,
          to: email,
          subject:'Reset Password',
          html: content
          }
    
          smtpTransport.sendMail(mailOptions,function(errors,res){
              models.account.findOne({

                where:{
                  email:email
                }
              }).then(account=>{

                createEmail('Reset Password',errors,account.id);
                console.log(errors);
                // console.log(res);
              })
              
            })
      }).catch(err=>{
        console.log(err);
      })
    }
    else
    {
        models.resetEmail.update({
          fromDttm:now,
          toDttm:hourLater,
          usedFl:false,
          versionNo: models.sequelize.literal('versionNo + 1')
        },{
          where:{
            email:email
          }
        }).then(()=>{
          var mailOptions = {
            from:process.env.mailServer_email,
            to: email,
            subject:'Reset Password',
            html: content
            }
      
            smtpTransport.sendMail(mailOptions,function(errors,res){
      
                models.account.findOne({
  
                  where:{
                    email:email
                  }
                }).then(account=>{
  
                  createEmail('Reset Password',errors,account.id);
                  console.log(errors);
                  console.log(res);
                })
                
            });
        }).catch(err=>{
          console.log(err)
        })
    }
  }).catch(err=>{
    console.log(err)
  })
  
}


async function testTrial(x,y, width,height, name , nameX, nameY, nameHeight, nameWidth)
{
  console.log('name X  ' + name);
  var newWidth = parseFloat(width);
  var newHeight = parseFloat(height); 

  var newX = parseFloat(x);
  var newY = parseFloat(y);
  var data = {x:newX, y:newY,width:newWidth,height:newHeight,name:name,nameX:nameX,nameY:nameY,nameHeight:nameHeight,nameWidth:nameWidth};
  const browser = await puppeteer.launch({
    'args' : [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  var date = Date.now();
  var filename = "tmp/reece.pdf";
  const page = await browser.newPage();

 
  const content = await compile('testTrial', data);
  await page.setContent(content);

  await page.setViewport({width:1400,height:800, deviceScaleFactor:2 });
   await page.pdf({
     path: filename,
     printBackground:true ,
     landscape:false,
     width:"14.5cm",
     height:"14.5cm" 
  });
  await browser.close();
}


async function test()
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  

  console.log('temp');
  var data ={};
  const content = await compile('delayEmail', data);
          var mailOptions = {
          from:process.env.mailServer_email,
          to: 'rmillermcpherson4@gmail.com',
          subject:' have confirmed their charity give back amount',
          html: content
          }
    
          smtpTransport.sendMail(mailOptions,function(errors,res){
    
            console.log(errors);
            console.log(res);
          
          });
}

async function sendConfirmDetailsEmail(schoolId,name,bankAcc,sortCode,type)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  var charityAmount = await models.charityAmount.findOne({
    where:{
      schoolFk:schoolId
    }
  });

  var school = await models.school.findOne({
        where:{
          id:schoolId
        }
  });

  var amount = charityAmount.amount;
  var data = {amount:amount, school:school.name,name:name, sortCode:sortCode,bankAcc:bankAcc,type:type};
    
  const content = await compile('charityConfirmEmail', data);
  var mailOptions = {
          from:process.env.mailServer_email,
          to: env == 'development' ? testEmail : process.env.mailServer_email,
          subject:school.name + ' have confirmed their charity give back amount',
          html: content
      };
    
  smtpTransport.sendMail(mailOptions, async function(errors,res){
            
    var account = await models.account.findOne({
        where:{
          email:school.email
        }
      });

    await createEmail('Confirmed Charity Amount Bluwave',errors,account.id);    
    console.log(errors);
    console.log(res);
  })

}

async function noDeadlineResponse()
{
  // find all schools on waiting for customer response step which have had email sent out
  // are on the deadline step continuefl is null
  // move to printing step

  var schools = await models.sequelize.query('select s.*, d.emailSentDttm from schools s ' +
    ' inner join statuses st on st.schoolFk = s.id ' + 
    ' inner join deadlines d on d.schoolFk = s.id ' + 
    ' where st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc LIMIT 1) ' + 
    ' and st.statusTypeFk = 5 ' + 
    ' and d.continueFl is false ' +
    ' and d.delayFl is false ' +
    ' and d.emailSentFl = true ', {type:models.sequelize.QueryTypes.SELECT});
    
    console.log(schools);
    // for each school
    // check whether we have gone passed the 3 day window
    await forEachNoResponseDeadline(schools,schoolNoResponseDeadline);
     
}

async function schoolNoResponseDeadline(school)
{
  var emailSentDttm = school.emailSentDttm;
  console.log(emailSentDttm);
  var date = new Date(emailSentDttm);
  var window = new Date();
  window.setDate(date.getDate() + 3);

  if(window.getTime() < Date.now()) {
    // move school to next step
    await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.PRINTING);
    // TO-DO send email maybe to customer
    // TO-DO send email to bluwave
  }
}

async function forEachNoResponseDeadline(schools, callback)
{
  for(var i =0 ; i < schools.length; i++)
  {
    await callback(schools[i]);
  }
}

async function charity()
{
  var schools = await models.sequelize.query('select distinct s.*, st.createdDttm from basketitems b ' +
  ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' + 
  ' inner join productItems pi on b.productItemFk = pi.id ' + 
  ' inner join classes c on pi.classFk = c.id ' + 
  ' inner join schools s on c.schoolFk = s.id ' + 
  ' inner join statuses st on st.schoolFk = s.id ' + 
  ' where pb.status = :completed ' +
  ' and st.id = (select st2.id from statuses st2 where st2.schoolFk = s.id order by st2.createdDttm desc LIMIT 1) ' +
  ' and st.statusTypeFk = 9',{replacements:{completed:'Completed'}, type:models.sequelize.QueryTypes.SELECT})

  if(schools.length > 0 )
  {
    console.log(schools);

    for( var i = 0; i < schools.length; i++ )
    {
      var school = schools[i];

      await sendGiveBackAmountEmailToSchool(school);
    }
  }
}

async function sendGiveBackAmountEmailToSchool(school) {
  var giveBackAmountBreakDownPerClass = await schoolUtility.getGiveBackAmountBreakDownPerClass(school.id);
  var totalGiveBackAmount = giveBackAmountBreakDownPerClass.totalGiveBackAmount;
  
  await schoolUtility.createCharityAmount(school.id, totalGiveBackAmount);
  await sendCharityEmail(school);
}

async function sendCharityEmail(school) {
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  var account = await models.account.findOne({
    where:{
      email:school.email
    }
  });


  var name = account.name;
  var confirmLink =urlPrefix + '/login?confirmAmount=true';
  const content = await compile('charityEmail', {name:name, confirmLink:confirmLink});
  var mailOptions = {
    from:process.env.mailServer_email,
    to: (env == 'development') ? testEmail : school.email,
    subject:'Charity contribution amount',
    html: content
  }

      
smtpTransport.sendMail(mailOptions,async function(errors,res){

  console.log(errors);
  console.log(res);

   await createEmail('Charity',errors,account.id);
    if(!errors) {
      // TO-DO  save model detailing that email has been sent
        // create new status moving the 
  
      await schoolUtility.createNewStatusForSchoolId(school.id, STATUS_TYPES.STATUS_TYPES_ID.WAITING_FOR_CHARITABLE_CONTRIBUTION_RESPONSE);

      mailOptions.to = (env == 'development') ? testEmail : process.env.mailServer_email;

      smtpTransport.sendMail(mailOptions,async function(errors,res){

        console.log(errors);
        console.log(res);

        await createEmail('Charity Bluwave',errors,account.id);
      });
    }
  
  });

  // create new template
  
}

async function generateCharityConfirmPdf(result, totalGiveback, schoolName,pageNumber,numberOfPages, finalPage)
{
  var data = {items:result, totalGiveBack:totalGiveback, schoolName:schoolName, numberOfPages:numberOfPages, pageNumber:pageNumber, finalPage:finalPage};
  const browser = await puppeteer.launch({
    'args' : [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  var date = Date.now();
  var filename = "tmp/charity_" + date + '_' +pageNumber + ".pdf";
  const page = await browser.newPage();

 
  const content = await compile('charityInvoice', data);
  await page.setContent(content);

  await page.setViewport({width:1400,height:800, deviceScaleFactor:2 });
  await page.pdf({
    path: filename,
    printBackground:true ,
    landscape:false,
    format:'A4'
  });
  await browser.close();

  return filename;
}

async function eachPurchaseSchool(array,callback)
{

    for(var i = 0; i <array.length ; i++)
    {
      var school = array[i];

        await callback(school);
      
       
    }
}


async function delayRecurringTask()
{
  var schools = await models.sequelize.query('select s.* from schools s ' + 
                  ' inner join deadlines d on d.schoolFk = s.id ', {type:models.sequelize.QueryTypes.SELECT});

  for(var i = 0; i < schools.length; i++)
  {
    var school = schools[i];
    
    var status = await models.sequelize.query('select s.*, concat(date(s.createdDttm), :beforeMidnight) as createdDttm from statuses s ' + 
                                  ' inner join schools sch on s.schoolFk = sch.id ' + 
                                  ' where sch.id = :schoolId ' +
                                  ' order by s.createdDttm  desc LIMIT 1', {replacements:{schoolId:school.id, beforeMidnight: ' 23:59:59'},
                                   type:models.sequelize.QueryTypes.SELECT });

    status = status[0];

    if(status.statusTypeFk == 6)
    {
      // current step is delay
      var delayDttm  = new Date(status.createdDttm);
      var window = new Date();
      window.setDate(delayDttm.getDate() + 3);

      if( window.getTime() < Date.now()) {

        await schoolUtility.createNewStatusForSchoolId(school.id, PRINTING_STATUS_TYPE_ID);
        await sendDelayEmail(school.id);
        
      }
    }
  }

}

async function deadlineRecurringTask() {
  var deadlines = await models.sequelize.query('select d.* from deadlines d ' +
              ' inner join schools s on d.schoolFk = s.id ' + 
              ' where d.emailSentFl = false ' + 
              ' and concat(date(d.deadLineDttm ), :beforeMidnight)< now() ' + 
              ' and d.continueFl = false ' +
              ' and d.delayFl = false ', {replacements:{beforeMidnight:' 23:59:59'}, type:models.sequelize.QueryTypes.SELECT}).catch(err=>{
                console.log(err)
              })

  for( var i = 0; i < deadlines.length; i++) {
    var deadline = deadlines[i];
  
    var schoolId = deadline.schoolFk;

    // if no purchase deadline step, create one else just create waiting step

    var purchaseDeadlineStatus = await schoolUtility.getSchoolStatusByStatusTypeId(schoolId, STATUS_TYPES.STATUS_TYPES_ID.PURCHASE_DEADLINE);

    if(purchaseDeadlineStatus == null) {
      await schoolUtility.createNewStatusForSchoolId(schoolId, STATUS_TYPES.STATUS_TYPES_ID.PURCHASE_DEADLINE);
    }

    await schoolUtility.createNewStatusForSchoolId(schoolId, STATUS_TYPES.STATUS_TYPES_ID.WAITING_FOR_CUSTOMER_RESPONSE);
    await sendDeadlineEmail(schoolId);
  }
                 
}

async function sendDelayEmail(schoolId)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  var school = await models.school.findOne({
    where:{
      id:schoolId
    }
  });

  var account = await models.account.findOne({
      where:{
        email:school.email
      }
    });

  var data = {name:account.name};
        
  const content = await compile('delayEmail', data);
  var mailOptions = {
                      from:process.env.mailServer_email,
                      to: env == 'development' ? testEmail : school.email,
                      subject:'Delay Period has now passed',
                      html: content
                    };

  smtpTransport.sendMail(mailOptions,async function(errors,res){
    console.log(errors);
    console.log(res);
  
    await createEmail('Delay',errors,account.id);
    if(!errors)
    {
      await models.deadLine.update({
          emailSentFl:true,
          emailSentDttm:Date.now()
      },
      {
        where:
        {
          schoolFk:schoolId
        }
      });
    }
  });
}

async function sendDeadlineEmail(schoolId)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  var school = await models.school.findOne({
    where:{
      id:schoolId
    }
  });

  var account = await models.account.findOne({
      where:{
        email:school.email
      }
  })

  var deadline = await models.deadLine.findOne({
    where:{
      schoolFk:schoolId
    }
  });

  console.log(deadline)

  var data = {continueLink:urlPrefix + '/continue?verificationCode=' + deadline.verificationCode,
  delayLink:urlPrefix + '/delay?verificationCode=' + deadline.verificationCode,
  name:account.name};
      
  const content = await compile('deadlineEmail', data);
  var mailOptions = {
      from:process.env.mailServer_email,
      to: env == 'development' ? testEmail :school.email,
      subject:'Purchase Deadline has now passed',
      html: content

  }

  smtpTransport.sendMail(mailOptions,async function(errors,res){

    await createEmail('Deadline',errors,account.id);

    if(!errors)
    {
        await models.deadLine.update({
          emailSentFl:true,
          emailSentDttm:Date.now(),
          versionNo: models.sequelize.literal('versionNo + 1')
        },
        {
          where:{
            schoolFk:schoolId
          }
        })
    }
      
    console.log(errors);
    console.log(res);
  })
}

async function createCalendar(template, data, width,height)
{
  const browser = await puppeteer.launch({
    'args' : [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const page = await browser.newPage();
  const content = await compile(template, data);
  await page.setContent(content);

  await page.setViewport({width:1400,height:800, deviceScaleFactor:2 });
  var buffer = await page.pdf({
     
    printBackground:true ,
    landscape:false,
    width:width,
    height:height 
  });

  await browser.close();

  return buffer;
} 

async function uploadToS3(buffer,s3FileLocation)
{
  const s3 = new aws.S3();
  var params = {
    Bucket:process.env.bucketName,
    Body: buffer,
    Key: s3FileLocation,
    ACL:'public-read'
  };

  var s3UploadPromise = new Promise(function(resolve, reject) {
    s3.upload(params, function(err, data) {
        if (err) {
            reject(err);
        } else {
            resolve(data);
        }
    });
});

await s3UploadPromise;
}

async function createCalendarAndUploadToS3Bucket(data,height,width,portrait,color, now, job,progress)
{
  data.background = process.env.s3BucketPath + 'Calendar/Pictures/Background/' + (portrait == true ? 'portrait' + color + '.png' : 'landscape' + color + '.png'); 
  
  var template = 'calendar' + (portrait == true ? 'Portrait' : 'Landscape');
  
  progress++;
  job.progress(progress)

  var buffer = await createCalendar(template, data, width, height);

  progress++;
  job.progress(progress)

  var buffer2 = await createCalendar(template + 'Preview', data, width, height);
  progress++;
  job.progress(progress);

  var fileLocation = data.schoolName + "/" + data.year + "/" + data.className + "/Calendar/" + (portrait == true ? "Portrait/" : "Landscape/");
  var previewFileLocation = fileLocation + 'Previews/';
    
  var filename =  data.kidName + "_" + color +"_" + now + ".pdf";
  var s3FileLocation =  fileLocation + filename;

  var s3PreviewFileLocation = previewFileLocation + filename;
    
  await uploadToS3( buffer, s3FileLocation );
  progress++;
  job.progress(progress)

  await uploadToS3( buffer2, s3PreviewFileLocation );

  progress++;
  job.progress(progress)
  
  return [job,progress];
}

function updateCalendar(calendarId,job)
{
  var progress = 1;
  job.progress(progress);
  return models.calendar.findOne({
    where:{
      id:calendarId
    }
  }).then(calendar=>{

    return models.sequelize.query('select k.name, s.name as schoolName, c.name as className, y.year from kids k ' + 
                    ' inner join classes c on k.classFk = c.id ' + 
                    ' inner join years y on c.yearFk = y.id ' + 
                    ' inner join schools s on c.schoolFk = s.id ' + 
                    ' where k.id = :kidId ',{replacements:{kidId:calendar.kidFk}, type:models.sequelize.QueryTypes.SELECT}).
                    then( async result=>{
                          result = result[0];
                      console.log(result);
                      var data ={ calendarPicture:calendar.calendarPicture, kidName:result.name, schoolName:result.schoolName,
                      className:result.className, year:result.year };
                      
                      var result;
                      var now = Date.now();
                      result = await createCalendarAndUploadToS3Bucket(data, "29.7cm","42cm",false, 'Red',now, job, progress );
                      job = result[0];
                      progress = result[1];

                      result = await createCalendarAndUploadToS3Bucket(data, "29.7cm","42cm",false, 'Green',now, job, progress );
                      job = result[0];
                      progress = result[1];

                      result = await createCalendarAndUploadToS3Bucket(data, "29.7cm","42cm",false, 'Blue',now, job, progress );
                      job = result[0];
                      progress = result[1];
                      
                      result = await createCalendarAndUploadToS3Bucket(data, "42cm","25cm",true, 'Red',now, job, progress );
                      job = result[0];
                      progress = result[1];

                      result = await createCalendarAndUploadToS3Bucket(data, "42cm","25cm",true, 'Green',now, job, progress );
                      job = result[0];
                      progress = result[1];
                      
                      result = await createCalendarAndUploadToS3Bucket(data, "42cm","25cm",true, 'Blue',now, job, progress );
                      job = result[0];
                      progress = result[1];  

                      var filePortraitLocation = data.schoolName + "/" + data.year + "/" + data.className + "/Calendar/Portrait/";
                      var fileLandscapeLocation = data.schoolName + "/" + data.year + "/" + data.className + "/Calendar/Landscape/";
                      var previewPortraitFileLocation = filePortraitLocation + 'Previews/';
                      var previewLandscapeFileLocation = fileLandscapeLocation + 'Previews/';
                      var redFilename = data.kidName + "_Red_" + now + ".pdf";
                      var greenFilename = data.kidName + "_Green_" + now + ".pdf";
                      var blueFilename = data.kidName + "_Blue_" + now + ".pdf";

                      models.calendar.update({
                        landscapeRedPath: process.env.s3BucketPath + fileLandscapeLocation + redFilename,
                        landscapeGreenPath: process.env.s3BucketPath + fileLandscapeLocation + greenFilename,
                        landscapeBluePath: process.env.s3BucketPath + fileLandscapeLocation + blueFilename,
                        landscapeRedPathPreview:process.env.s3BucketPath + previewLandscapeFileLocation + redFilename,
                        landscapeGreenPathPreview:process.env.s3BucketPath + previewLandscapeFileLocation + greenFilename,
                        landscapeBluePathPreview:process.env.s3BucketPath + previewLandscapeFileLocation + blueFilename,
                        portraitRedPath:process.env.s3BucketPath + filePortraitLocation + redFilename ,
                        portraitGreenPath:process.env.s3BucketPath + filePortraitLocation + greenFilename,
                        portraitBluePath:process.env.s3BucketPath + filePortraitLocation + blueFilename,
                        portraitRedPathPreview:process.env.s3BucketPath + previewPortraitFileLocation + redFilename,
                        portraitGreenPathPreview:process.env.s3BucketPath + previewPortraitFileLocation + greenFilename,
                        portraitBluePathPreview:process.env.s3BucketPath + previewPortraitFileLocation + blueFilename
                      },{
                          where:{
                            id:calendarId
                          }
                      }).then(()=>{
                          progress++;
                          job.progress(progress);
                      })
                    })



  })
  // get calendar object

  // for each type of calendar ie portrait land, colors create calendar
}

async function sendPurchaseEmail( bluwave, basketItems, orderNumber, date, total, time, job )
{
  var smtpTransport = nodeMailer.createTransport({
      host:process.env.mailServer_host,
      port:587,
      secure:false,
      auth:{
        user:process.env.mailServer_email,
        pass:process.env.mailServer_password
      }
  });

  var basketItem = basketItems[0];
  var parentAccount = await models.account.findOne({
          where:{
            id:basketItem.accountFk
          }
        });  
  
  var template = 'purchaseIndividual';
  
  var purchaseBasket = await models.purchaseBasket.findOne({
                                where:{
                                  orderNumber:orderNumber
                                }});
  var deliveryName = purchaseBasket.deliveryName;
  var deliveryPrice = purchaseBasket.deliveryPrice;

  if(deliveryName == 'Collect From School')
  {
    template = 'purchaseEmail';
    var basketItem = basketItems[0];
    var school = await schoolUtility.getSchoolFromBasketItemId(basketItem.basketItemId);
    
    var postCode = school.postCode;

    school = school.name;
    var data = {total:total,basketItems:basketItems,date:date,time:time,orderNumber:orderNumber,school:school,postCode:postCode,
          parentAccount:parentAccount, email: parentAccount.email, phone:parentAccount.telephoneNumber};

      const content = await compile(template, data);
      var mailOptions = {
                          from:process.env.mailServer_email,
                          to: bluwave ? process.env.mailServer_email : basketItems[0].email,
                          subject:'Thanks for making a purchase',
                          html: content
                        }
      
      smtpTransport.sendMail(mailOptions,function(errors,res){
          console.log('BIg guns')
          createEmail((bluwave) ? 'Parent Purchase Bluwave' : 'Parent Purchase',errors,parentAccount.id);
          console.log(errors);
          // console.log(res);
          // job.progress(100);
        
      });
  }
  else
  {
      var basketItem = basketItems[0];
      var school = basketItem.school;
      var missedDeadline = false;
      if(school != 'Individuals')
        missedDeadline = true;
      
      var shippingAddress = await models.shippingAddress.findOne({
        where:{
          id: purchaseBasket.shippingAddressFk
        }
      });

      var country = await models.country.findOne({
        where:{
          id:shippingAddress.countryFk
        }
      });
        
      var data ={orderNumber:orderNumber,
          date:date,basketItems:basketItems,
          total:total,addressLine1:shippingAddress.addressLine1,addressLine2:shippingAddress.addressLine2, city:shippingAddress.city,
          postCode:shippingAddress.postCode, fullName:shippingAddress.fullName, email:parentAccount.email, accountName: parentAccount.name,
          time:time,country:country.name, deliveryCost:(parseFloat(deliveryPrice)).toFixed(2),deliveryType:deliveryName, missedDeadline:missedDeadline, school:school};

      const content = await compile(template, data);

      // var attachmentPath = await orderController.getOrderDetailsGroupByTypeForId(purchaseBasket.id, job);
      // console.log(attachmentPath.pdfPath)
      var mailOptions = {
                          from:process.env.mailServer_email,
                          to:bluwave ? process.env.mailServer_email : basketItems[0].email,
                          subject:'Thanks for making a purchase',
                          html: content
                        }
    // if(bluwave == true)
    // {
    //   mailOptions['attachments'] = [{
    //     path:attachmentPath.pdfPath,
    //     filename:purchaseBasket.orderNumber + '.zip'
    //   }];
    // }
              
    smtpTransport.sendMail(mailOptions,function(errors,res){
      
        createEmail((bluwave) ? 'Individual Purchase' :'Individual Purchase Bluwave',errors,parentAccount.id);
        console.log(errors);
        // console.log(res);
        // job.progress(100);
      
    });

  }
  
}

const sendOrganiserRegistrationEmailToBluwave = function(school,name,account, numberOfClasses, job)
{
  var smtpTransport = nodeMailer.createTransport({
  host:process.env.mailServer_host,
  port:587,
  secure:false,
  auth:{
    user:process.env.mailServer_email,
    pass:process.env.mailServer_password
  }
});

var mailOptions = {
  from:process.env.mailServer_email,
  to:env == 'development' ? testEmail : process.env.mailServer_email,
  subject:'Organiser ' + name + ' has registered school ' + school.name,
  html:'<p>' + 
  'School/Nursery Name: ' + school.name + '<br>' +
  'School/Nursery Address: ' + school.address + '<br>' + 
  'School/Nursery Post Code: ' + school.postCode +'<br><br>' + 
  'Name: ' + name + '<br>' + 
  'Email: <a href="' + school.email + '">' +school.email +'</a><br>' +
  'Telephone: ' + school.number + '<br>' + 
  'Additional Information: ' + (school.additionalInfo == null ? '' : school.additionalInfo) + '<br><br>' + 
  'Pupils Per Class: ' + school.numberOfKidsPerClass +'<br>' + 
  'Number Of Classes: ' + numberOfClasses + '<br><br>' + 
  'Date: ' + account.createdAt + '<br><br></p>' +
  '<p>Kids Christmas Cards at Bluwave</p><br>' +
  '<p>T 020 7277 7663</p>'+
  '<p>Bluwave Ltd<br>Unit 1b, 1a Philip Walk<br>London SE15 3NH</p><br>' +
  '<p>DISCLAIMER<br>This e-mail message, including any attachments, is intended solely for the use of the addressee and may contain confidential and legally privileged information. If you have received this email in error and it is not intended for you, please inform the sender and delete the e-mail and any attachments immediately. NOTE: Regardless of content, this e-mail shall not operate to bind Bluwave Ltd to any order or other contract unless pursuant to explicit written agreement or government initiative expressly permitting the use of e-mail for such purpose. Whilst we take reasonable precautions to ensure that our emails are free from viruses, we cannot be responsible for any viruses transmitted with this e-mail and recommend that you subject any incoming e-mail to your own virus checking procedures.</p><br><br>' +
  '<p>Bluwave Ltd, Registered in England and Wales (registered no. 048 400 51) Registered Office: Unit 1b 1a Philip Walk SE15 3NH, United Kingdom.</p><br>' +
  '<p>Website: <a href="www.thebluwavegroup.com">www.thebluwavegroup.com</a></p>'
}
smtpTransport.sendMail(mailOptions,function(errors,res){
  
    createEmail('Organiser Registration Bluwave',errors,account.id);
    console.log(errors);
    console.log(res);
    job.progress(100);
 
});
}

const sendOrganiserRegistrationEmail = async function(email,school,name,job)
{
  var smtpTransport = nodeMailer.createTransport({
  host:process.env.mailServer_host,
  port:587,
  secure:false,
  auth:{
    user:process.env.mailServer_email,
    pass:process.env.mailServer_password
  }
});

var data = {schoolName:school.name, name:name};
const content = await compile('registerOrganiser', data);
  var mailOptions = {
    from:process.env.mailServer_email,
    to: env == 'development' ? testEmail : email,
    subject:'Welcome to Kidscards4christmas fundraising project',
    html:content
  }

  smtpTransport.sendMail(mailOptions,function(errors,res){
    
    models.account.findOne({
      where:{
        email:email
      }
    }).then(account=>{
        createEmail('Organiser Registration', errors, account.id);
        
        console.log(errors);
        console.log(res);
        job.progress(100);

      })
    
  });

 
}

const sendParentRegistrationEmailToBluwave = function(email,name,telephoneNo,job)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });

  var accountType =  'Parent ';
  var emailType =  'Parent Registration Bluwave';
  var mailOptions = {
    from:process.env.mailServer_email,
    to: process.env.mailServer_email,
    subject:accountType + name + ' has registered',
    html:'<p>New ' + accountType + ' registration</p>' +
    '<p>Parent name: ' + name + '</p>'+
    '<p>Tel: ' + telephoneNo + '</p>' +
    '<p>Email: ' + email + '</p>' +
    '<p>Kids Christmas Cards at Bluwave</p><br>' +
    '<p>T 020 7277 7663</p>'+
    '<p>Bluwave Ltd<br>Unit 1b, 1a Philip Walk<br>London SE15 3NH</p><br>' +
    '<p>DISCLAIMER<br>This e-mail message, including any attachments, is intended solely for the use of the addressee and may contain confidential and legally privileged information. If you have received this email in error and it is not intended for you, please inform the sender and delete the e-mail and any attachments immediately. NOTE: Regardless of content, this e-mail shall not operate to bind Bluwave Ltd to any order or other contract unless pursuant to explicit written agreement or government initiative expressly permitting the use of e-mail for such purpose. Whilst we take reasonable precautions to ensure that our emails are free from viruses, we cannot be responsible for any viruses transmitted with this e-mail and recommend that you subject any incoming e-mail to your own virus checking procedures.</p><br><br>' +
    '<p>Bluwave Ltd, Registered in England and Wales (registered no. 048 400 51) Registered Office: Unit 1b 1a Philip Walk SE15 3NH, United Kingdom.</p><br>' +
    '<p>Website: <a href="www.thebluwavegroup.com">www.thebluwavegroup.com</a></p>'
  }
  smtpTransport.sendMail(mailOptions,function(errors,res){
    
    models.account.findOne({
      where:{
        email:email
      }
    }).then(account=>{

      createEmail(emailType,errors,account.id);
      console.log(errors);
      console.log(res);
      job.progress(100);
    })

  });

}

const sendParentRegistrationEmail = async function(email,job)
{
  var smtpTransport = nodeMailer.createTransport({
    host:process.env.mailServer_host,
    port:587,
    secure:false,
    auth:{
      user:process.env.mailServer_email,
      pass:process.env.mailServer_password
    }
  });
  
  models.account.findOne({
    where:{
      email:email
    }
  }).then(async account=>{

    var accountType = account.accountTypeFk;
    var template;
    var emailType;
    if(accountType == 2)
    {
      template = 'registerParent';
      emailType = 'Parent Registration';
    }
    else
    {
      template = 'registerIndividualParent';
      emailType = 'Individual Registration';
    }

    const content = await compile(template, {});
  var mailOptions = {
    from:process.env.mailServer_email,
    to:email,
    subject:'Thank you for registering',
    html:content
  }


  smtpTransport.sendMail(mailOptions, async function(errors,res){
    
    // console.log(res);

    createEmail(emailType,errors,account.id);
    

    job.progress(100);
  })

  })
 
}

const createEmail = async function(emailType,errors,accountId)
{
  var status = (errors) ? 'Failed': 'Success';
  models.emailType.findOne({
    where:{
      emailType:emailType
    }
  }).then(async emailType=>{

    await models.email.create({
      emailTypeFk:emailType.id,
      sentDttm: Date.now(),
      status:status,
      accountFk:accountId,
      deleteFl: false,
      versionNo:1
    });  
  }).catch(err=>{
    console.log(err);
  })
}

const generatePurchasedCards = async function(purchasedBasketItems,classId, job)
{
  let processed = 1;
  job.progress(processed);
  processed++;
  const s3 = new aws.S3();
  var params = {
  Bucket:process.env.bucketName,
  };

  if(purchasedBasketItems.length > 1)
  {
    var files = new Array();
  let now = Date.now();
  files = await asyncForEachDownload(purchasedBasketItems,downloadPurchasedFiles,params,files,s3);
  job.progress(processed);
  processed++;

  var purchaseBuffer = await PDFMerge(files, {output: process.cwd() + '/tmp/'  + now + '_purchased.pdf'});
  files.forEach(file=>{
    fs.unlink(file);
})
job.progress(processed);
processed++;

return models.class.findOne({
  where:{
    id:classId
  }
}).then(async schoolClass=>{

  params.Key = 'Purchased' +'/' + (schoolClass==null? 'undefined' : schoolClass.name) + now + '_purchased.pdf';
params.ACL = 'public-read' ;
params.Body = purchaseBuffer;

var s3UploadPromise = new Promise(function(resolve, reject) {
 s3.upload(params, function(err, data) {
     if (err) {
         reject(err);
     } else {
         resolve(data);
     }
 });
});

await s3UploadPromise;
job.progress(processed);
processed++;
    fs.unlink(  process.cwd() + '/tmp/'  + now + '_purchased.pdf');

   var path = process.env.s3BucketPath+params.Key;
 return   models.class.update(
        {cardsPath:path},
             {where:{
               id:classId
             }
    }).then(()=>{

      job.progress(processed);
      
      return path;
    })
  
})
  }
  else
  {
    var purchasedBasketItem = purchasedBasketItems[0];
    var cardPath = purchasedBasketItem.path;
    job.progress(4);
   return models.class.update(
      {cardsPath:cardPath},
           {where:{
             id:classId
           }}).then(()=>{

            job.progress(5);
    
        return cardPath;
    })
    
  }
  

  
}

const createCards = async function(job)
{
  var errors = {};
  let classId = job.data.classId;
  // check whether any kids have been created for the class
  models.kid.findOne({
    where:{
      classFk:classId,
      deleteFl:false
    }
  }).then(kid=>{

    if(kid == null)
    {
      errors['createCards'] = 'There are no kids in the class so no cards can be created.';
      return {errors:errors};
      // getClassScreen(req,res,classId,errors);
      // no kids in class so no cards can be generated
    }
    else
    {
      // generate cards for class
      models.class.findOne({
        where:
        {
          id:classId
        }
      }).then( async schoolClass=>{
        let cards = new Array();
        cards = await createCardsForWholeClass(classId,schoolClass.schoolFk,schoolClass.yearFk,cards,job);

      })
      
    }
  })

  // A job can return values that will be stored in Redis as JSON
  // This return value is unused in this demo application.
  return { value: "This will be stored" };
}

const generatePrintForm = async function(classId,purchasedCardDetails, numberOfPurchasedItems,purchasedExtras, job)
{
  let array = new Array();
  let innerList = new Array();
  let purchasedExtrasArray = new Array();
  let purchasedExtrasInnerList = new Array();
  var purchasedExtrasCount = 0;
  let count = 0;
  
  let processed = 1;
  job.progress(processed);
  processed++;
  
  while( numberOfPurchasedItems > 0 )
  {
      if( count % 10 == 0 && count != 0)
      {
        array.push(innerList);
        innerList = new Array();
        
      }
      
      innerList.push(purchasedCardDetails[count]);

     numberOfPurchasedItems--;
     if(numberOfPurchasedItems == 0)
      array.push(innerList);
     count++;
  }

  // length of array gives page number
  // count gives number of items on the page
  // 
  var numberOfPurchasedExtras = purchasedExtras.length;
  while(numberOfPurchasedExtras > 0)
  {
    if( purchasedExtrasCount % 10 == 0 && purchasedExtrasCount != 0)
    {
      purchasedExtrasArray.push(purchasedExtrasInnerList);
      purchasedExtrasInnerList = new Array();
      
    }
      
    purchasedExtrasInnerList.push(purchasedExtras[purchasedExtrasCount]);

    numberOfPurchasedExtras--;
    if(numberOfPurchasedExtras == 0)
      purchasedExtrasArray.push(purchasedExtrasInnerList);
      purchasedExtrasCount++;
  }

  job.progress(processed);
  processed++;

  let classSchool = await models.sequelize.query('select c.name as className, s.name as schoolName from classes c ' + 
    ' inner join schools s on c.schoolFk = s.id ' + 
    ' where c.id = :classId ', {replacements:{classId:classId}, type:models.sequelize.QueryTypes.SELECT})
    .then(result=>{

        var data = {className:result[0].className,schoolName:result[0].schoolName};
        return data;
    })

    job.progress(processed);
    processed++;

  let pageNumber = 1;
  let numberOfPages = array.length + purchasedExtrasArray.length;
  let files = new Array();
  for(let i=0 ; i< array.length;i++)
  {

    var x = await generatePrintFormPage(array[i],classSchool,pageNumber,numberOfPages);
    files.push(x);
    pageNumber++;
  }

  for(let i=0 ; i< purchasedExtrasArray.length;i++)
  {

    var x = await generatePrintExtrasFormPage(purchasedExtrasArray[i],classSchool,pageNumber,numberOfPages);
    files.push(x);
    pageNumber++;
  }

  job.progress(processed);
  processed++;

  let now = Date.now();
  // prod upload the file use file path
  var buffer = await PDFMerge(files, {output: process.cwd() + '/tmp/'  + now + '_printForm.pdf'});
  files.forEach(file=>{
    fs.unlink(file);
});

job.progress(processed);
  processed++;

const s3 = new aws.S3();
let s3FileLocation = classSchool.schoolName + '/' + classSchool.className + '/' + Date.now() + "_printForm.pdf";

var params = {
  Bucket:process.env.bucketName,
  Body: buffer,
  Key: s3FileLocation,
  ACL:'public-read'
};

var s3UploadPromise = new Promise(function(resolve, reject) {
s3.upload(params, function(err, data) {
    if (err) {
        reject(err);
    } else {
        resolve(data);
    }
});
});

await s3UploadPromise;

job.progress(processed);
  processed++;

let s3Path = process.env.s3BucketPath + s3FileLocation;

  return models.class.update({
  printFormPath:s3Path
  },{
  where:{
    id:classId
  }
  }).then(()=>{

    job.progress(processed);

  return s3Path;
  })
}

const createCardAdmin = async function(kidId, job)
{
  let cards = new Array();
  let processed = 1;
  models.kid.findOne({
    where:{
      id:kidId,
      deleteFl:false
    }
  }).then(kid=>{

    models.class.findOne({
      where:{
        id:kid.classFk
      }
    }).then(async schoolClass=>{
      job.progress(processed);
      processed++;
      await createCardForSingleKid(kidId,kid.classFk,schoolClass.schoolFk,schoolClass.yearFk,cards, job, processed);
                    
    })
  })
}

const updateCardArtworkAndPicture = async function(files,kidId,name,age,displaySchool,displayClass,displayAge,month, job)
{
  let processed = 1;
  job.progress(processed);
  processed++;
  await tempMethod(files,kidId,name,age, month,displaySchool,displayClass,displayAge);
    
  job.progress(processed);
  processed++;

  models.kid.findOne({
    where:{
      id:kidId
    }
  }).then(kid=>{
    models.class.findOne({
      where:{
        id:kid.classFk
      }
    }).then(async schoolClass=>{

      let cards = new Array();
      await createCardForSingleKid(kidId,kid.classFk,schoolClass.schoolFk,schoolClass.yearFk,cards,job,processed);
    })
  })
    
}

const tempMethod = async function(files,kidId,name,age,month,displaySchool,displayClass,displayAge)
{
   let date = Date.now();
    const s3 = new aws.S3();
  if( files == null )
  {

    await models.kid.update(
      {name:name,
        age: age,
        month:month,
      displayClass:displayClass,
      displaySchool:displaySchool,
      displayAge:displayAge},
      {where:{
        id:kidId
      }}
    );
  }
  else
  {
   var fileName = await models.uploadFileName.build().save().then(uploadFileName=>{

      return uploadFileName.id;
    });
  
   var suffix =(files.file2.mimeType == 'image/png') ? 'png' : 'jpg';
    let s3ArtworkPath = process.env.s3BucketPath+"Artwork/" + date +'_' + fileName + '.' + suffix;
    var buffer= Buffer.from(files.file2.data.data);
    var params = {
    Bucket:process.env.bucketName,
    Body: buffer,
    Key: 'Artwork/'+ date +'_' + fileName + '.' + suffix,
    ACL:'public-read'
    }; 

    var s3UploadPromise = new Promise(function(resolve, reject) {
      s3.upload(params, function(err, data) {
          if (err) {
              reject(err);
          } else {
              resolve(data);
          }
      });

    });

    await s3UploadPromise;

        await models.kid.update(
          {name:name,
           age: age,
           month:month,
          displayClass:displayClass,
          displaySchool:displaySchool,
          displayAge:displayAge,
          artwork:s3ArtworkPath},
          {where:{
            id:kidId
          }});
  }
  
}


const updateCard = async function(classFk,kidId,age,name,displaySchool,displayClass,displayAge,files, job)
{
    let cards = new Array();
    let processed = 1;
    // check whether kids details have been changed
    // console.log(files);
    return models.kid.findOne({
      where:{
        id: kidId
      }
    }).then(async kid=>{
       
    
      if(kid.name == name && kid.age == age && kid.classFk == classFk && 
            kid.displaySchool == displaySchool && kid.displayAge == displayAge && kid.displayClass == displayClass 
           &&  files == null )
      {
         // nothing to change  
         console.log('reece');
        job.progress(8);

      }
      else
      {
        console.log('zita');
        job.progress(processed);
        processed++;
        if( files == null )
        {
          await models.kid.update(
            {name:name,
             age: age,
             classFk: classFk,
            displayClass:displayClass,
            displaySchool:displaySchool,
            displayAge:displayAge},
            {where:{
              id:kidId
            }}
          );
          
        processed++;
        
        processed++;
        processed++;
        
        job.progress(processed);
        }
        else
        {
          let date = Date.now();
          var fileName = await models.uploadFileName.build().save().then(uploadFileName=>{
  
            return uploadFileName.id;
          });
          
          var suffix =(files.file2.mimeType == 'image/png') ? 'png' : 'jpg';
          let s3ArtworkPath = process.env.s3BucketPath +"Artwork/" + date + '_' + fileName + '.' + suffix;
      
          var buffer =Buffer.from(files.file2.data.data);
            const s3 = new aws.S3();
            var params = {
            Bucket:process.env.bucketName,
            Body: buffer,
            Key: 'Artwork/' +  date + '_' + fileName + '.' + suffix,
            ACL:'public-read'
            }; 
  
                 var s3UploadPromise = new Promise(function(resolve, reject) {
              s3.upload(params, function(err, data) {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(data);
                  }
              });
  
            });
  
            await s3UploadPromise;
  
            job.progress(processed);
            processed++;
              
                await models.kid.update(
                  {name:name,
                   age: age,
                   classFk: classFk,
                  displayClass:displayClass,
                  displaySchool:displaySchool,
                  displayAge:displayAge,
                  picture:s3ArtworkPath,
                  artwork:s3ArtworkPath},
                  {where:{
                    id:kidId
                  }}
                );
                
        job.progress(processed);
        processed++;
        job.progress(processed);
        processed++;
        }
        
            // create new card
           models.class.findOne({
             where:{
               id:classFk
             }
           }).then(async schoolClass=>{
            cards = await createCardForSingleKid(kidId,classFk,schoolClass.schoolFk,schoolClass.yearFk, cards, job, processed);
        //     job.progress(processed);
        // processed++;
            // let card = cards[0];
   
            // models.sequelize.query('select c.* from cards c ' +
            //                      ' inner join kids k on c.kidFk = k.id ' +
            //                      ' inner join classes cl on k.classFk = cl.id ' + 
            //                      ' where cl.id = :classId ' +
            //                      ' and k.deleteFl = false ',
            //                      {replacements:{classId:classFk},type:models.sequelize.QueryTypes.SELECT}).
            //                      then( async cards=>{
            //                       //  await createClassBatch(cards, classFk);
   
            //                          res.json({cardIndex:selectedCardIndex, user:req.user, path:card.path, previewPath: card.previewPath, samplePath:card.samplePath });
   
   
            //                      })
  
           })
        
      }
  
    })
  
}
const createCardsForWholeClass = function(classId,schoolId,yearId, cards,job)
{
  return models.kid.findAll({
    where:{
      classFk:classId,
      deleteFl:false
    }
  }).then(async kidsResults=>{

    // socketServer.emit('kidTotal',{total:kidsResults.length});
    let processed = 1;
    for( let i=0;i< kidsResults.length; i++)
    {
       let result = kidsResults[i];
       let kidId = result.dataValues.id;
       cards = await createCardForSingleKid(kidId,classId,schoolId,yearId, cards, job,processed);
        processed = cards[i].processed;
    
    }

    return cards;

  });
}

const createCardForSingleKid = function(kidId,classId,schoolId,yearId, cards,job,processed)
{
  return models.kid.findOne({
    where:{
      id:kidId,
      deleteFl:false
    }
  }).then(kid=>{

   return models.class.findOne({
      where:{
        id:classId
      }
    }).then(kidClass=>{

      return  models.school.findOne({
        where:{
          id:schoolId
        }
      }).then(school=>{
         return models.year.findOne({
            where:{
              id:yearId
            }
          }).then(year=>{

           return createCard(school,year,kidClass,kid,cards,job,processed);
          })
      })
    })
  })
}

const createCard = async function(school,year,kidClass, kid, cards,job,processed)
{

      let displaySchool = kid.displaySchool == true ? 'true' : undefined;
      let displayClass = kid.displayClass == true ? 'true' : undefined;
      let displayAge = kid.displayAge == true ? 'true' : undefined;

      let displayYears;
      let displayMonths;
      let displayBoth;

      if( kid.age != 0 && kid.month != 0 )
      {
        // display both
        displayBoth = 'true';
      }
      else if( kid.age !=0)
      {
        // display year
        displayYears = 'true';
      }
      else
      {
        // display month
        displayMonths = 'true';
      }
      let array = new Array();
      let json  = {
                "school":school.name,
                "code":kid.code,
                "name":kid.name,
                "age":kid.age,
                "month":kid.month,
                "class":kidClass.name,
                "artwork":kid.artwork,
                "picture": kid.picture,
                "year":year.year,
                "kidId":kid.id,
                "displaySchool":displaySchool,
                "displayClass":displayClass,
                "displayAge":displayAge,
                "displayYears":displayYears,
                "displayMonths": displayMonths,
                "displayBoth": displayBoth
                }

              array.push(json);  
              
           await  asyncForEach(array,createPdf,cards, job, processed);

           return cards;
}
const asyncForEach = async function(dataTemp, callback, array,job,processed)
{
  for(let i = 0; i< dataTemp.length; i++)
  {
   let card =  await callback( dataTemp[i], job,processed);
   array.push(card);
  }
}
const createPdf = async function( data, job, processed )
{
    const browser = await puppeteer.launch({
      'args' : [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    const page = await browser.newPage();

    const dataPicture = data.picture;
    var originalData = data;
    originalData.picture = data.artwork;
    originalData.displayPicture = true;
    const content = await compile('card', originalData);
    await page.setContent(content);
    //await page.emulateMedia('screen');
    
    var tempDir = "dataDir/temp/OutBound/";
    // var previewTempDir = "dataDir/temp/OutBound/";
    let fileLocation = data.school + "/" + data.year + "/" + data.class + "/";
    // let previewFileLocation = data.school + "/" + data.year + "/" + data.class + "/Previews/";
    let package2FileLocation = data.school + "/" + data.year + "/" + data.class + "/Pacakge 2/";
    // let package2PreviewFileLocation = data.school + "/" + data.year + "/" + data.class + "/Pacakge 2/Previews/";
    let filename =  data.name + "_" + data.code + ".pdf";
    
    tempDir = tempDir + fileLocation + filename;
    // previewTempDir = previewTempDir + previewFileLocation + filename;

    await page.setViewport({width:1400,height:800, deviceScaleFactor:2 });
    const buffer = await page.pdf({
      // path: tempDir,
      printBackground:true ,
      landscape:false,
      width:"29cm",
      height:"14.5cm" 
    });

// save file in temp directory, which shouldnt need to be on the server
// then upload the file with a dir name to s3 bucket 
// then save the card to db with path location on s3 bucket
    await browser.close();
  
    const s3 = new aws.S3();
    let s3FileLocation = fileLocation + Date.now() + "_" + filename;
    // let s3PreviewFileLocation = previewFileLocation + Date.now() + "_" + filename;
    let s3Package2FileLocation = package2FileLocation + Date.now() + "_" + filename;
    // let s3Package2PreviewFileLocation = package2PreviewFileLocation + Date.now() + "_" + filename;
    var params = {
      Bucket:process.env.bucketName,
      Body: buffer,
      Key: s3FileLocation,
      ACL:'public-read'
    };

    var s3UploadPromise = new Promise(function(resolve, reject) {
      s3.upload(params, function(err, data) {
          if (err) {
              reject(err);
          } else {
              resolve(data);
          }
      });
  });

  await s3UploadPromise;
  // await fs.unlink(tempDir);
  // delete from temp dir
    let s3Path = process.env.s3BucketPath + s3FileLocation;
    // let s3PreviewPath = process.env.s3BucketPath + s3PreviewFileLocation;
    let s3Package2Path = process.env.s3BucketPath + s3Package2FileLocation;
    // let s3Package2PreviewPath = process.env.s3BucketPath + s3Package2PreviewFileLocation;
    // const browser2 = await puppeteer.launch({
    //   'args' : [
    //     '--no-sandbox',
    //     '--disable-setuid-sandbox'
    //   ]
    // });

    job.progress(processed);
    processed++;
    // const page2= await browser2.newPage();

    // const content2 = await compile('cardWatermark', originalData);
    // await page2.setContent(content2);
   
    // let dir2 = "public/dataDir/temp/OutBound/";
    // dir2 = dir2 + data.school + "/" + data.year + "/" + data.class + "/" + data.name + "_" + data.code + "_Preview.pdf";
  //  const buffer2=   await page2.pdf({
  //     // path: previewTempDir,
  //     printBackground:true ,
  //     landscape:false,
  //     width:"29cm",
  //     height:"14.5cm" 
  //   });

  //   await browser2.close();
  //   var previewParams = {
  //     Bucket:process.env.bucketName,
  //     Body: buffer2,
  //     Key: s3PreviewFileLocation,
  //     ACL:'public-read'
  //   };

  //   var s3PreviewUploadPromise = new Promise(function(resolve, reject) {
  //     s3.upload(previewParams, function(err, data) {
  //         if (err) {
  //             reject(err);
  //         } else {
  //             resolve(data);
  //         }
  //     });
  // });

  // await s3PreviewUploadPromise;
  
  originalData.picture ='';
  job.progress(processed);
    processed++;
  const browser3 = await puppeteer.launch({
    'args' : [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  originalData.displayPicture = dataPicture != null;
  originalData.picture = (dataPicture != null) ? dataPicture : "https://kidscards4christmas.s3.eu-west-2.amazonaws.com/icons/insertImage.jpg" ;
  const page3= await browser3.newPage();

    const content3 = await compile('card', originalData);
    await page3.setContent(content3);
   
    const buffer3 = await page3.pdf({
      // path: previewTempDir,
      printBackground:true ,
      landscape:false,
      width:"29cm",
      height:"14.5cm" 
    });

    await browser3.close();
    var package2Params = {
      Bucket:process.env.bucketName,
      Body: buffer3,
      Key: s3Package2FileLocation,
      ACL:'public-read'
    };

    var s3Package2UploadPromise = new Promise(function(resolve, reject) {
      s3.upload(package2Params, function(err, data) {
          if (err) {
              reject(err);
          } else {
              resolve(data);
          }
      });
  });

  
  await s3Package2UploadPromise;
  job.progress(processed);
    processed++;
  // const browser4 = await puppeteer.launch({
  //   'args' : [
  //     '--no-sandbox',
  //     '--disable-setuid-sandbox'
  //   ]
  // });

  // const page4= await browser4.newPage();

  //   const content4 = await compile('cardWatermark', originalData);
  //   await page4.setContent(content4);
   
  //   const buffer4 = await page4.pdf({
  //     // path: previewTempDir,
  //     printBackground:true ,
  //     landscape:false,
  //     width:"29cm",
  //     height:"14.5cm" 
  //   });

  //   await browser4.close();
  //   var package2PreviewParams = {
  //     Bucket:process.env.bucketName,
  //     Body: buffer4,
  //     Key: s3Package2PreviewFileLocation,
  //     ACL:'public-read'
  //   };

  //   var s3Package2PreviewUploadPromise = new Promise(function(resolve, reject) {
  //     s3.upload(package2PreviewParams, function(err, data) {
  //         if (err) {
  //             reject(err);
  //         } else {
  //             resolve(data);
  //         }
  //     });
  // });

  // await s3Package2PreviewUploadPromise;

  job.progress(processed);
    processed++;
   return models.card.findOne({
      where:{
        kidFk:data.kidId
      }
    }).then(card=>{

      if(card === null)
      {
          let newCard = models.card.build({
            path:s3Path,
            // previewPath:s3PreviewPath,
            package2Path:s3Package2Path,
            // package2PreviewPath:s3Package2PreviewPath,
            fileName:s3FileLocation,
            // previewFileName: s3PreviewFileLocation,
            package2FileName: s3Package2FileLocation,
            // package2PreviewFileName:s3Package2PreviewFileLocation,
            kidFk:data.kidId
          });

        return  newCard.save().then(()=>{
            return {card:newCard,processed:processed};
          });
      }
      else
      {
       return  models.card.update(
           {path:s3Path,
          // previewPath:s3PreviewPath,
          package2Path:s3Package2Path,
            // package2PreviewPath:s3Package2PreviewPath,
          fileName:s3FileLocation,
          // previewFileName: s3PreviewFileLocation,
          package2FileName: s3Package2FileLocation,
            // package2PreviewFileName:s3Package2PreviewFileLocation
          },
           {where:{
             kidFk:data.kidId
           }}
         ).then(()=>{
           return models.card.findOne({
             where:{
               kidFk:data.kidId
             }
           }).then(card=>{
            return {card:card,processed:processed};
           })
         })
      }

    }) 
}

const createProofs = async function(kids,classId,year,className,schoolName,job)
{
  let processed = 1;
  job.progress(processed);
  processed++;
  let files = new Array();
  await asyncForEachProofs( kids,createProofForClass,files);

  job.progress(processed);
  processed++;
  
  // var sampleArray = await models.sequelize.query('select cd.samplePath, cd.sampleFileName from cards cd  ' +
  // ' inner join kids k on cd.kidFk = k.id ' + 
  // ' inner join classes c on k.classFk = c.id ' + 
  // ' where c.id = :classId ' +
  // ' and k.deleteFl = false '
  // , {replacements:{
  //     classId: classId
  //       }, type: models.sequelize.QueryTypes.SELECT 
  //   });

  job.progress(processed);
  processed++;
  // put check that sampleArray has length greater than zero
  const s3 = new aws.S3();
  var params = {
  Bucket:process.env.bucketName,
  };

  // var files = new Array();
  let now = Date.now();
  // files = await asyncForEachDownload(sampleArray,downloadProofFiles,params,files,s3);
  
  job.progress(processed);
  processed++;
  // if(files.length > 0 )
  // {
      var proofBuffer = await PDFMerge(files, {output: process.cwd() + '/tmp/'  + now + '_proof.pdf'});

      files.forEach(file=>{
          fs.unlink(file);
      })

  job.progress(processed);
  processed++;
      // save proof to s3
      let fileLocation = schoolName + "/" + year + "/" + className + "/";
      console.log(fileLocation);
      params.Key = fileLocation + 'Proofs/' + now + '_proof.pdf';
      params.ACL = 'public-read' ;
      params.Body = proofBuffer;

      var s3UploadPromise = new Promise(function(resolve, reject) {
       s3.upload(params, function(err, data) {
           if (err) {
               reject(err);
           } else {
               resolve(data);
           }
       });
   });
 
   await s3UploadPromise;
  job.progress(processed);
  processed++;
  
  fs.unlink(  process.cwd() + '/tmp/'  + now + '_proof.pdf');

   var path = process.env.s3BucketPath+params.Key;
 return  models.class.update(
       {proofPath:path},
            {where:{
              id:classId
            }
   }).then(()=>{
    
    
    job.progress(processed);
    return path;
       
   })
}

const asyncForEachProofs = async function(array, callback,files)
{
    for( let i = 0; i < array.length; i++)
    {
      var filename =  await callback(array[i],i);
      files.push(filename);
    }
}

const asyncForEachDownload = async function(array, callback,params, files,s3)
{
    for(let i= 0 ;i<array.length; i++)
    {
       var fileName = await callback(array[i], params, i,s3);
       files.push(fileName);
      //  console.log(fileName);
    }

    return files;
}

const downloadProofFiles = async function(sampleItem, params, i,s3)
{
    const sampleFileName = sampleItem.sampleFileName;

    params.Key = sampleFileName;
    var file;
    const tempFile = 'tmp' +'/' +i +'.pdf';
    var s3DownloadPromise = new Promise((resolve,reject)=>{
    file = fs.createWriteStream(tempFile);
    var stream = s3.getObject(params).createReadStream();
    stream.pipe(file);

    stream.on('finish',resolve);
    });

    
    await s3DownloadPromise;
    console.log('file ' + file);
    return process.cwd() + '/'+tempFile;
}

const downloadPurchasedFiles = async function(purchasedFile, params, i,s3)
{
    var now = Date.now();
    const cardFileName = purchasedFile.fileName;
    params.Key = cardFileName;
    var file;
    const tempFile = 'tmp' +'/Purchased_' +i + '_' + now +'.pdf';
    var s3DownloadPromise = new Promise((resolve,reject)=>{
    file = fs.createWriteStream(tempFile);
    var stream = s3.getObject(params).createReadStream();
    stream.pipe(file);

    stream.on('finish',resolve);
    });

    
    await s3DownloadPromise;
    console.log('file ' + file);
    return process.cwd() + '/'+tempFile;
}

const createProofForClass = async function(kid,i)
{
    var now = Date.now();
    var deadLine = kid.deadLineDttm; /*dateformat(kid.deadLineDttm, "dddd dS mmmm yyyy");*/
    var month = kid.month;
    let displayYears;
    let displayMonths;
    let displayBoth;

    if( kid.age != 0 && month != 0 )
    {
      // display both
      displayBoth = 'true';
    }
    else if( kid.age !=0)
    {
      // display year
      displayYears = 'true';
    }
    else
    {
      // display month
      displayMonths = 'true';
    }
    let data  = {
        "school":kid.schoolName,
        "code":kid.code,
        "name":kid.name,
        "age":kid.age,
        "class":kid.className,
        "artwork":kid.artwork,
        "picture":kid.picture,
        "year":kid.year,
        "kidId":kid.id,
        "displaySchool":'true',
        "displayClass":'true',
        "displayAge":'true',
        "deadline": deadLine,
        "displayYears":displayYears,
        "displayMonths":displayMonths,
        "displayBoth":displayBoth,
        "month":month
        }

    let filename =  "tmp/Proof_"+kid.className+'_' + i+'_'+ now + ".pdf";
    const browser = await puppeteer.launch({
        'args' : [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
      const page= await browser.newPage();
    
      const content = await compile('sample', data);
      await page.setContent(content);

      await page.pdf({
        path:filename,
        printBackground:true ,
        format:'A4'
      });

await browser.close();

return filename;
}

const generatePrintFormPage = async function(array, classSchool,pageNumber,numberOfPages)
{

    var data = {
                className:classSchool.className,
                schoolName:classSchool.schoolName,
                basketItems:array,
                pageNumber:pageNumber,
                numberOfPages:numberOfPages
    }

    

  return await printForm( data, pageNumber,'printForm' );

}

const generatePrintExtrasFormPage = async function(array, classSchool,pageNumber,numberOfPages)
{
  var data = {
              className:classSchool.className,
              schoolName:classSchool.schoolName,
              basketItems:array,
              pageNumber:pageNumber,
              numberOfPages:numberOfPages
  }

  return await printForm( data, pageNumber,'printExtrasForm' );
}

const printForm  = async function(data, i,template)
{   
    var date = Date.now();
    let filename =  "tmp/reece_" + date + '_' + i + ".pdf";
    const browser = await puppeteer.launch({
      pipe:true,
       'args' : [
         '--no-sandbox',
         '--disable-setuid-sandbox'
       ]
     });
     const page= await browser.newPage();
     const content = await compile(template, data);
     await page.setContent(content);

     await page.pdf({
         path:filename,
       printBackground:true ,
       format:'A4'
     });

     browser.close();

     return filename;
    
}

async function sendOrdersNotShippedReminder()
{
  var orderNumbers = await models.sequelize.query('select pb.orderNumber from purchasebaskets pb ' +
        ' inner join shippingAddresses sa on pb.shippingAddressFk = sa.id where pb.status = :completed ' +
        ' and pb.shippedFl is false ', {replacements:{completed:'Completed'}, type: models.sequelize.QueryTypes.SELECT});

  console.log(orderNumbers)
  if(orderNumbers.length > 0)
  {
    var smtpTransport = nodeMailer.createTransport({
      host:process.env.mailServer_host,
      port:587,
      secure:false,
      auth:{
        user:process.env.mailServer_email,
        pass:process.env.mailServer_password
      }
    });
  
    const content = await compile('ordersToBeShippedReminder', {orderNumbers:orderNumbers});
    var mailOptions = {
      from:process.env.mailServer_email,
      to:env == 'development' ? testEmail : process.env.mailServer_email,
      subject:'REMINDER OF ORDERS TO BE SHIPPED',
      html:content
    }
  
    smtpTransport.sendMail(mailOptions, async function(errors,res){

      createEmail('Orders Not Shipped Reminder',errors,1);
      console.log(errors);
    })
  }
}

async function sendSchoolArtworkPacksNotSentReminder()
{
  var schools = await models.sequelize.query('select distinct s.* from schools s ' +
        ' inner join statuses st on st.schoolFk = s.id ' +
        ' inner join statusTypes stt on st.statusTypeFk = stt.id ' +
        ' where not exists  (select st2.statusTypeFk from statuses st2 where st2.schoolFk = s.id and st2.statusTypeFk = 3)', 
        {type: models.sequelize.QueryTypes.SELECT});

  console.log(schools)
  if(schools.length > 0)
  {
    var smtpTransport = nodeMailer.createTransport({
      host:process.env.mailServer_host,
      port:587,
      secure:false,
      auth:{
        user:process.env.mailServer_email,
        pass:process.env.mailServer_password
      }
    });
  
    const content = await compile('schoolArtworkPacksNotSentReminder', {schools:schools});
    var mailOptions = {
      from:process.env.mailServer_email,
      to:env == 'development' ? testEmail : process.env.mailServer_email,
      subject:'REMINDER OF SCHOOLS ARTWORK PACK NOT SENT OUT',
      html:content
    }
  
    smtpTransport.sendMail(mailOptions, async function(errors,res){

      createEmail('Artwork Pack Not Sent Reminder',errors,1);
      console.log(errors);
    })
  }
}

async function sendSchoolReadyForPrintingReminder()
{
  var schools = await models.sequelize.query('select s.* from schools s ' +
  ' inner join statuses st on st.schoolFk = s.id ' +
  ' inner join statusTypes stt on st.statusTypeFk = stt.id ' +
  ' where stt.id  = (select statusTypeFk from statuses where schoolFk = s.id order by createdDttm desc limit 1 ) ' +
  ' and stt.type = :printing ', 
        {replacements:{printing: 'Printing'}, type: models.sequelize.QueryTypes.SELECT});

  console.log(schools)
  if(schools.length > 0)
  {
    var smtpTransport = nodeMailer.createTransport({
      host:process.env.mailServer_host,
      port:587,
      secure:false,
      auth:{
        user:process.env.mailServer_email,
        pass:process.env.mailServer_password
      }
    });
  
    const content = await compile('schoolPrintingSentReminder', {schools:schools});
    var mailOptions = {
      from:process.env.mailServer_email,
      to:env == 'development' ? testEmail : process.env.mailServer_email,
      subject:'REMINDER OF SCHOOLS READY TO PRINT',
      html:content
    }
  
    smtpTransport.sendMail(mailOptions, async function(errors,res){

      createEmail('Printing Reminder',errors,1);
      console.log(errors);
    })
  }
}

async function sendCharityAmountConfirmedSendToSchoolReminder()
{
  var schools = await schoolUtility.getSchoolsRequiringGiveBackAction();
  if(schools.length > 0)
  {
    var smtpTransport = nodeMailer.createTransport({
      host:process.env.mailServer_host,
      port:587,
      secure:false,
      auth:{
        user:process.env.mailServer_email,
        pass:process.env.mailServer_password
      }
    });
  
    const content = await compile('charityAmountConfirmedSendToSchoolReminder', {schools:schools});
    var mailOptions = {
      from:process.env.mailServer_email,
      to:env == 'development' ? testEmail : process.env.mailServer_email,
      subject:'REMINDER OF SCHOOLS TO SEND FUNDRAISING AMOUNT TO',
      html:content
    }
  
    smtpTransport.sendMail(mailOptions, async function(errors,res){

      createEmail('Charity Amount Confirmed Reminder',errors,1);
      console.log(errors);
    })
  }
}



// function resendFailedEmails()
// {
//   models.email.findAll({
//     where:{
//       status:'Failed'
//     }
//   }).then(async failedEmails=>{

//     await forEachFailedEmail(failedEmails, resendFailedEmail);

//   })
// }

// async function forEachFailedEmail( array, callback)
// {
//    for(var i = 0; i< array.length; i++)
//    {
//       await callback(array[i]);
//    }
// }

// function resendFailedEmail(failedEmail)
// {
//    createEmail()
// }
// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ workers, start });