const models = require('../models');
var kidController = require('../controllers/KidController');
var schoolController = require('../controllers/SchoolController');
var queueController = require('../controllers/QueueController');
var orderController = require('../controllers/OrderController');
var adminController = require('../controllers/AdminController');

const PDFMerge = require('pdf-merge');
const aws = require('aws-sdk');
const config = require('../config/config.json');
const archiver = require('archiver');
// const REDIS_URL = process.env.REDISCLOUD_URL || 'redis://127.0.0.1:6379';
// // const Redis = require('ioredis');
// // const client = new Redis(REDIS_URL, {
// //     lazyConnect: true,
// //     tls: {
// //         rejectUnauthorized: false
// //     }
// // });
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
const hbs = require('handlebars');
const moment = require('moment');

aws.config.update({
    secretAccessKey: config.secretAccessKey,
    accessKeyId:config.accessKeyId,
    region: config.region
  });

exports.getClassById = async function(id)
{
    return await getClassById(id);
}

async function getClassById(id)
{
    return await models.class.findOne({
        where:{
            id:id
        }
    });
}

exports.getClassByNumber = async function(number)
{
    return await getClassByNumber(number);
}

async function getClassByNumber(number)
{
    return await models.class.findOne({
        where:{
            classNumber:number
        }
    });
}

exports.getOrderDetailsForAllKidsFromClassId = async function(classId, totalKids)
{
    return await getOrderDetailsForAllKidsFromClassId(classId, totalKids);
}

async function getOrderDetailsForAllKidsFromClassId(classId, totalKids)
{
    var orders = await models.sequelize.query('select count(distinct pb.id) as orderCount from purchasebaskets pb ' +
            ' inner join basketItems b on b.purchaseBasketFk = pb.id ' +
            ' inner join productItems pi on b.productItemFk = pi.id ' +
            ' inner join classes c on pi.classFk = c.id ' +
            ' where c.id = :classId ' +
            ' and pb.status = :completed ',
    {replacements:{classId:classId, completed:'Completed'},type:models.sequelize.QueryTypes.SELECT});

    var details = {
        orderCount: orders[0].orderCount,
        totalKids: totalKids
    }

    return details;

    
}

exports.getClassScreen = async function(req,res)
{
    var classNumber = req.query.classNumber;

    var schoolClass = await getClassByNumber(classNumber);
    var classId = schoolClass.id;
    var kids = await kidController.getKidsByClassId(classId);
    var orderDetails = await getOrderDetailsForAllKidsFromClassId(classId, kids.length);
    var orders = await orderController.getOrdersForClassId(classId);
    var backgroundSetting = await adminController.getBackgroundSetting(req.user.id);
    var ordersNotShipped = await adminController.getOrdersNotShipped();
    var schoolsRequiringGiveBackAction = await schoolController.getSchoolsRequiringGiveBackAction();

    res.render('adminClass', {user:req.user, schoolClass:schoolClass, backgroundSetting:backgroundSetting,
         kids:kids, orderDetails:orderDetails, orders:orders, ordersNotShipped:ordersNotShipped,
        schoolsRequiringGiveBackAction:schoolsRequiringGiveBackAction})
 
}

exports.getClassAndSchoolByNumber = async function(classNumber, schoolNumber)
{
    var result = await models.sequelize.query('select s.id as schoolId, c.id as classId from classes c ' + 
                ' inner join schools s on c.schoolFk = s.id ' + 
                ' where c.classNumber = :classNumber ' + 
                ' and s.schoolNumber = :schoolNumber ', 
                {replacements:{ schoolNumber: schoolNumber, classNumber:classNumber},
                type: models.sequelize.QueryTypes.SELECT});
    return result.length == 0 ? null : result[0];
}

exports.getClassOrderInstruction = async function(req,res)
{
    var classId = req.query.classId;
    var deadline = await schoolController.getSchoolDeadlineFromClassId(classId);

    if(deadline == null)
        return res.json({error:'No deadline has been set for the school'});

    var job = await queueController.addClassOrderInstructionJob(classId,deadline.id);
    res.json({id:job.id});
}

exports.getSchoolOrderInstruction = async function(req,res)
{
    var schoolId = req.query.schoolId;
    var deadline = await schoolController.getSchoolDeadlineBySchoolId(schoolId);

    if(deadline == null)
        return res.json({error:'No deadline has been set for the school'});

    var job = await queueController.addSchoolOrderInstructionJob(schoolId);
    res.json({id:job.id});
}

exports.processSchoolOrderInstruction = async function(schoolId, job)
{
    return await processSchoolOrderInstruction(schoolId, job);
}

const processSchoolOrderInstruction = async function(schoolId, job)
{
    var classes = await models.class.findAll({
        where:{
            schoolFk: schoolId
        }
    });

    var school = await models.school.findOne({
        where:{
            id:schoolId
        }
    })

    var deadline = await models.deadLine.findOne({
        where:{
          schoolFk:schoolId
        }
    });
 
    var params = {
        Bucket:config.bucketName,
    };

    const s3 = new aws.S3();
    var files = [];

    var progress = 1;
    for( var i = 0; i < classes.length; i++ )
    {
        var json = await processClassOrderInstruction(classes[i].id, deadline.id, progress, i + 1, job);
        
        var file = await downloadFiles(json.pdfPath, params, i, s3);
        progress = json.progress;
        files.push(file);
        console.log(progress)
    }

    
    progress++;
    job.progress(progress);

    var now = Date.now();

    var coverFileName = process.cwd() + '/' + await generateCoverSheetForSchoolOrderInstructions(school, classes, now);
    files.unshift(coverFileName);
    var purchaseBuffer = await PDFMerge(files, {output: process.cwd() + '/tmp/'  + now + '_school_order_instruction.pdf'}).catch(err=>{
        console.log(err)
    });

    files.forEach(file=>{
        fs.unlink(file);
    })

    var fileName = 'SchoolOrderInstruction' +'/' + school.name + now + '_school_order_instruction.pdf'
    params.Key = fileName;
    params.ACL = 'public-read' ;
    params.Body = purchaseBuffer;

    var pdfPath = config.s3BucketPath + fileName;
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

    progress++;
    job.progress(progress);

    console.log(progress);
    var schoolOrderInstruction = await models.schoolOrderInstruction.findOne({
        where:{
            schoolFk: schoolId
        }
    });

    if(schoolOrderInstruction == null)
    {
        await models.schoolOrderInstruction.create({
            schoolFk: schoolId,
            createdDttm: Date.now(),
            pdfPath: pdfPath,
            versionNo: 1,
            deleteFl: false
        })
    }
    else
    {
        await models.schoolOrderInstruction.update({
            createdDttm: Date.now(),
            pdfPath: pdfPath,
            versionNo: models.sequelize.literal('versionNo + 1')
        }, {
            where:{
                schoolFk: schoolId
            }
        })
    }


    progress++;
    job.progress(progress);
    return {pdfPath:pdfPath,progress:progress };
}

async function generateCoverSheetForSchoolOrderInstructions(school, classes, now)
{
    var data = {school:school.name, classTotal: classes.length, numberOfKidsPerClass: school.numberOfKidsPerClass };
    var filename =  "tmp/CoverOrderInstruction_" + school.name + '_'+ now + ".pdf";
    const browser = await puppeteer.launch({
        'args' : [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
        });
    console.log(filename)
    const page = await browser.newPage();

    const content = await compile('schoolOrderInstruction', data);
    await page.setContent(content);
    
    await page.pdf({
        path:filename,
        printBackground:true ,
        format:'A4'
    });
            
    await browser.close();

    return filename;
}

const downloadFiles = async function(filePath, params, i,s3)
{
    var now = Date.now();
    const fileName = filePath.replace(config.s3BucketPath,'');
    params.Key = fileName;
    var file;
    const tempFile = 'tmp' +'/SchoolOrderInstruction' + i + '_' + now +'.pdf';
    var s3DownloadPromise = new Promise((resolve,reject)=>{
    file = fs.createWriteStream(tempFile);
    var stream = s3.getObject(params).createReadStream();
    stream.pipe(file);

    stream.on('finish',resolve);
    });
    
    await s3DownloadPromise;
    console.log('file ' + file);
    return process.cwd() + '/' + tempFile;
}

const processClassOrderInstruction = async function(classId, deadlineId, progress, classNumber, job)
{
    var classOrderInstruction = await models.classOrderInstruction.findOne({
        where:{
            classFk: classId,
        }
    });

    progress++;
    job.progress(progress);

    var schoolClass = await getClassById(classId);
    var schoolDeadline = await models.deadLine.findOne({
        where:{
            id:deadlineId
        }
    });

    if(classOrderInstruction == null)
    {
        // means that no orderinstruction has been created before
        // create order instruction
       return await createOrderInstruction(schoolClass, schoolDeadline, true, progress, job);
    }

    if(classOrderInstruction.deadLineDttm.toString() == schoolDeadline.deadLineDttm.toString())
    {
        // means order instruction has been created before and we would be generating the exact same copy
        progress =(5 * classNumber) + 1;
        job.progress(progress);
        console.log(progress)
        return {pdfPath:classOrderInstruction.pdfPath, progress:progress};
    }

    return await createOrderInstruction(schoolClass, schoolDeadline, false, progress, job);     
    
}

exports.processClassOrderInstruction = async function(classId, deadlineId, progress, classNumber, job)
{
    return await processClassOrderInstruction(classId, deadlineId, progress, classNumber, job);
}

async function createOrderInstruction(schoolClass, schoolDeadline, createFl, progress, job)
{
    var school = await schoolController.getSchoolFromSchoolId(schoolClass.schoolFk);
    var now = Date.now();

    var unparsedDeadLine = schoolDeadline.deadLineDttm;

    var month =unparsedDeadLine.getMonth() + 1;
    month = month <10 ? '0' + month : month;
    var days = unparsedDeadLine.getDate();
    days = days <10 ? '0' + days : days;
    var years = unparsedDeadLine.getFullYear();

    var deadline = years + '-' + month + '-' + days;

    var data = {
                    class:schoolClass.name, 
                    classNumber:schoolClass.classNumber,
                    school:school.name,
                    schoolNumber:school.schoolNumber,
                    deadline: deadline
                }
    progress++;
    job.progress(progress);

    var filename =  "tmp/OrderInstruction_" + schoolClass.name + '_'+ now + ".pdf";
    const browser = await puppeteer.launch({
        'args' : [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
        });
    console.log(filename)
    const page = await browser.newPage();

    const content = await compile('orderInstructions2', data);
    await page.setContent(content);
    const buffer = await page.pdf({
        path:filename,
        landscape:true,
        printBackground:true ,
        format:'A4'
    });
            
    await browser.close();
    progress++;
    job.progress(progress);

    const s3 = new aws.S3();
    var params = {
        Bucket:config.bucketName,
        Body: buffer,
        Key: filename,
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

    progress++;
    job.progress(progress);
    var classOrderInstruction;
    if(createFl)
    {
        classOrderInstruction = await models.classOrderInstruction.create({
            classFk:schoolClass.id,
            deadLineDttm: schoolDeadline.deadLineDttm,
            createdDttm: Date.now(),
            pdfPath: config.s3BucketPath + filename,
            deleteFl: false,
            versionNo: 1
    
        })
    }
    else
    {
        await models.classOrderInstruction.update({
            deadLineDttm: schoolDeadline.deadLineDttm,
            createdDttm: Date.now(),
            pdfPath: config.s3BucketPath + filename,
            versionNo: models.sequelize.literal('versionNo + 1')
        },{
            where:{
                classFk: schoolClass.id
            }
        });

        classOrderInstruction = await models.classOrderInstruction.findOne({
            where:{
                classFk:schoolClass.id
            }
        })
    }

    progress++;
    job.progress(progress);

    return  {pdfPath:classOrderInstruction.pdfPath, progress:progress};
}

exports.getCreateOrderInstructionJob = async function(req,res)
{
    var id = req.query.id;
    var job = await queueController.getJobId(id);
  
    if (job === null) {
      res.status(404).end();
    } else {
        var state = await job.getState();
        var progress = job._progress;
        var reason = job.failedReason;
        var instructionPath = (job.returnvalue == null) ? undefined : (job.returnvalue).pdfPath;
        var process = job.data.process;
        console.log(job.returnvalue);
        res.json({ id, state, progress, reason, instructionPath, process });
    }
}


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

async function getOrderFormDetailsForClassId(classId)
{
    var schoolClass = await getClassById(classId);
    var school = await schoolController.getSchoolFromClassId(classId);

    var query = 'select distinct b.*, pv.name as productVariant, p.name as product, pb.orderNumber, pi.classFk from products p ' +
        ' inner join productTypes pt on p.productTypeFk = pt.id ' +
        ' inner join productVariants pv on pv.productFk = p.id ' +
        ' inner join productItems pi on pi.productVariantFk = pv.id ' +
        ' inner join basketItems b on b.productItemFk = pi.id ' +
        ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
        ' inner join classes c on pi.classFk = c.id ' +
        ' where pb.status = :completed ' +
        ' and pt.type = :christmasType ' +                          
        ' and c.id = :classId ' +
        ' and pb.shippingAddressFk is null ';

    var cardsFromClass = await models.sequelize.query(query,
                {replacements:{classId:classId, completed:'Completed', christmasType:'Christmas Cards'},
                 type: models.sequelize.QueryTypes.SELECT});

    
    query = 'select distinct b.*, pv.name as productVariant, p.name as product, pb.orderNumber, pi.classFk  from purchaseBaskets pb ' +
    ' inner join basketItems b on b.purchaseBasketFk = pb.id ' + 
    ' inner join productItems pi on b.productItemFk = pi.id  ' +
    ' inner join productVariants pv on pi.productVariantFk = pv.id  ' +
    ' inner join products p on pv.productFk = p.id  ' +
    ' where pb.status = :completed ' +
    ' and pi.classFk is null ' +
    ' and pb.shippingAddressFk is null '
    ' and pi.accountFk in ( ' +
    ' select distinct b.accountFk from classes c ' +
    ' inner join classes c1 on c1.schoolFk = c.schoolFk ' +
    ' inner join productItems pi on pi.classFk = c1.id  ' +
    ' inner join basketItems b on b.productItemFk = pi.id  ' +
    ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id  ' +
    ' inner join kids k on pi.kidFk = k.id  ' +
    ' where c.id = :classId ' +
    ' and pb.status = :completed)';

    var cardsNotPartOfAnyClass = await models.sequelize.query(query,
            {replacements:{classId:classId, completed:'Completed', christmasType:'Christmas Cards'},
                type: models.sequelize.QueryTypes.SELECT});
    

    query = ' select b.*, pv.name as productVariant, p.name as product, pb.orderNumber, pi.classFk, a.name as parentName from purchaseBaskets pb '  + 
            ' inner join basketItems b on b.purchaseBasketFk = pb.id ' + 
            ' inner join productItems pi on b.productItemFk = pi.id ' +
            ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
            ' inner join products p on pv.productFk = p.id ' +  
            ' inner join accounts a on b.accountFk = a.id ' +
            ' where pb.status = :completed ' +
            ' and pi.kidFk is null ' + 
            ' and pi.classFk = :classId ' +
            ' and pb.shippingAddressFk is null ';

    var calendarsLinkedToClass = await models.sequelize.query(query,
        {replacements:{classId:classId, completed:'Completed'},
            type: models.sequelize.QueryTypes.SELECT});

    query = 'select distinct b.*, pv.name as productVariant, p.name as product, pb.orderNumber, pi.classFk, a.name as parentName  from purchaseBaskets pb ' +
            ' inner join basketItems b on b.purchaseBasketFk = pb.id  ' +
            ' inner join productItems pi on b.productItemFk = pi.id ' +
            ' inner join productVariants pv on pi.productVariantFk = pv.id ' +
            ' inner join products p on pv.productFk = p.id ' +
            ' inner join accounts a on b.accountFk = a.id ' +
            ' where pb.status = :completed ' +
            ' and pi.kidFk is null ' +
            ' and pi.classFk is null ' +
            ' and pb.shippingAddressFk is null ' +
            ' and pi.accountFk in ( ' +
            ' select distinct b.accountFk from products p ' +
            ' inner join productTypes pt on p.productTypeFk = pt.id ' +
            ' inner join productVariants pv on pv.productFk = p.id ' +
            ' inner join productItems pi on pi.productVariantFk = pv.id ' +
            ' inner join basketItems b on b.productItemFk = pi.id ' +
            ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id  ' +
            ' inner join kids k on pi.kidFk = k.id ' +
            ' inner join classes c on k.classFk = c.id ' +
            ' where pt.type = :christmasType ' + 
            ' and pb.status = :completed ' +
            ' and c.id = :classId)';

    var calendarsNotLinkedToClass = await models.sequelize.query(query,
        {replacements:{classId:classId, completed:'Completed', christmasType:'Christmas Cards'},
            type: models.sequelize.QueryTypes.SELECT});

    var cards = [];
    var calendars = [];

    cardsFromClass.forEach(card => {
        cards.push(card);
    });

    cardsNotPartOfAnyClass.forEach(card => {
        cards.push(card);
    });

    calendarsLinkedToClass.forEach(calendar => {
        calendars.push(calendar);
    });

    calendarsNotLinkedToClass.forEach(calendar => {
        calendars.push(calendar);
    });
    

    return {cards:cards, calendars:calendars, school:school, schoolClass:schoolClass};
}

exports.generateOrdersPdf = async function(classId, job)
{
    var progress = 1;
    job.progress(progress);

    var orderFormDetails = await getOrderFormDetailsForClassId(classId);
    var cards = orderFormDetails.cards;
    var calendars = orderFormDetails.calendars;
    var schoolClass = orderFormDetails.schoolClass;
    var school = orderFormDetails.school;
    
    progress++;
    job.progress(progress);

    const s3 = new aws.S3();
    var params = {
        Bucket:config.bucketName,
    };

    var path = null;

    if(cards.length > 0)
        path = await downloadPurchasedFiles(cards[0], params, 0, s3);
    
    progress++;
    job.progress(progress);

    if(cards.length > 1)
    {
        var files = new Array();
        var now = Date.now();
        files = await asyncForEachDownload(cards,downloadPurchasedFiles,params,files,s3);

        path = process.cwd() + '/tmp/'  + now + '_purchased.pdf';
        await PDFMerge(files, {output: path});
        files.forEach(file=>{
            fs.unlink(file);
        });
    }

    progress++;
    job.progress(progress);

    var path2 = null;

    if(calendars.length > 0)
        path2 = await downloadPurchasedFiles(calendars[0], params, 0, s3);

    progress++;
    job.progress(progress);

    if(calendars.length > 1)
    {
        var files = new Array();
        var now = Date.now();
        files = await asyncForEachDownload(calendars,downloadPurchasedFiles,params,files,s3);

        path2 = process.cwd() + '/tmp/'  + now + '_calendars_purchased.pdf';

        await PDFMerge(files, {output: path2});
        files.forEach(file=>{
            fs.unlink(file);
        });
    }

    progress++;
    job.progress(progress);

    var dir = './tmp/' + now + '_purchases';

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    if(path != null)
    {
        fs.rename(path, dir + '/cards.pdf', function (err) {
            if (err) throw err
        });
    }
 
    if(path2 != null)
    {
        fs.rename(path2, dir + '/calendars.pdf', function (err) {
            if (err) throw err
        })
    }
    
    progress++;
    job.progress(progress);

    const archive = archiver('zip', { zlib: { level: 9 }});
    var fileName = 'tmp/' + school.name + '_' + schoolClass.name + '_' + now + 'purchase_result.zip'
    const stream = fs.createWriteStream(fileName);

    var archivePromise = new Promise((resolve, reject) => {
        archive.directory(dir, false).on('error', err => reject(err)).pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });

    await archivePromise;

    var s3Stream = fs.createReadStream(fileName);
    params = {
        Bucket:config.bucketName,
        Body: s3Stream,
        Key: fileName,
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
    await stream.on('close', () => resolve());
    progress++;
    job.progress(progress);

    return {pdfPath:config.s3BucketPath + fileName};
}

exports.downloadPurchasedFiles = async function(purchasedFile, params, i,s3)
{
    return await downloadPurchasedFiles(purchasedFile, params, i,s3);
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
    return process.cwd() + '/'+tempFile;
}

exports.asyncForEachDownload = async function(array, callback,params, files,s3)
{
    return await asyncForEachDownload(array, callback,params, files,s3);
}

const asyncForEachDownload = async function(array, callback,params, files,s3)
{
    for(let i= 0 ;i<array.length; i++)
    {
       var fileName = await callback(array[i], params, i,s3);
       files.push(fileName);
    }

    return files;
}

exports.generateOrderForm = async function(req,res)
{
    var classId = req.body.classId;
    var orderFormDetails = await getOrderFormDetailsForClassId(classId);
    var cards = orderFormDetails.cards;
    var calendars = orderFormDetails.calendars;

    if(cards.length == 0 && calendars.length == 0)
        return res.json({error:'No purchases to be delivered to the school have been made'});
    var job = await queueController.addOrderFormJob(classId);
    res.json({id:job.id});
}

exports.generatePrintForm = async function(classId, job)
{
    var progress = 1;
    job.progress(progress);

    var orderFormDetails = await getOrderFormDetailsForClassId(classId);
    var cards = orderFormDetails.cards;
    var calendars = orderFormDetails.calendars;
    var school = orderFormDetails.school;
    var schoolClass = orderFormDetails.schoolClass;

    var cardsArray = new Array();
    var innerList = new Array();
    var calendarsArray = new Array();
    var calendarsInnerList = new Array();
    var calendarsCount = 0;
    var count = 0;

    var numberOfCards = cards.length;
    
    progress++;
    job.progress(progress);

    while( numberOfCards > 0 )
    {
        if( count % 10 == 0 && count != 0)
        {
            cardsArray.push(innerList);
            innerList = new Array();
        }
        
        innerList.push(cards[count]);

        numberOfCards--;
        if(numberOfCards == 0)
            cardsArray.push(innerList);
        count++;
    }

    var numberOfCalendars = calendars.length;
    while(numberOfCalendars > 0)
    {
        if( calendarsCount % 10 == 0 && calendarsCount != 0)
        {
            calendarsArray.push(calendarsInnerList);
            calendarsInnerList = new Array();
        }
        
        calendarsInnerList.push(calendars[calendarsCount]);

        numberOfCalendars--;
        if(numberOfCalendars == 0)
            calendarsArray.push(calendarsInnerList);
        calendarsCount++;
    }

    progress++;
    job.progress(progress);

    var pageNumber = 1;
    var numberOfPages = cardsArray.length + calendarsArray.length;
    let files = new Array();
    for(var i = 0; i < cardsArray.length; i++)
    {
        console.log(cardsArray[i])
        var x = await generatePrintFormPage(cardsArray[i], school, schoolClass, pageNumber, numberOfPages);
        console.log(x)
        files.push(x);
        pageNumber++;
    }

    progress++;
    job.progress(progress);

    for(var i = 0; i < calendarsArray.length; i++)
    {
        var x = await generateCalendarsFormPage(calendarsArray[i], school, schoolClass, pageNumber, numberOfPages);
        files.push(x);
        pageNumber++;
    }

    progress++;
    job.progress(progress);
    var now = Date.now();
    // prod upload the file use file path
    var buffer = await PDFMerge(files, {output: process.cwd() + '/tmp/'  + now + '_printForm.pdf'});
    
    files.forEach(file=>{
        fs.unlink(file);
    });


    progress++;
    job.progress(progress);

    const s3 = new aws.S3();
    var s3FileLocation = school.name + '/' + schoolClass.name + '/' + now + "_printForm.pdf";

    var params = {
    Bucket:config.bucketName,
    Body: buffer,
    Key: s3FileLocation,
    ACL:'public-read'
    };

    var s3UploadPromise = new Promise(function(resolve, reject) {
    s3.upload(params, function(err, data) 
    {
        if (err) {
            reject(err);
        } else {
            resolve(data);
        }
        });
    });

    await s3UploadPromise;

    progress++;
    job.progress(progress);

    var s3Path = config.s3BucketPath + s3FileLocation;
    return s3Path;
}

async function generatePrintFormPage(array, school, schoolClass, pageNumber, numberOfPages)
{
    var data = {
                className:schoolClass.name,
                schoolName:school.name,
                basketItems:array,
                pageNumber:pageNumber,
                numberOfPages:numberOfPages
    }

    return await printForm(data, pageNumber,'printForm');
}

async function generateCalendarsFormPage(array, school, schoolClass, pageNumber,numberOfPages)
{
    var data = {
                className:schoolClass.name,
                schoolName:school.name,
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

exports.getPurchasedOrders = async function(req,res)
{
    var classId = req.body.classId;

    var orderFormDetails = await getOrderFormDetailsForClassId(classId);
    var cards = orderFormDetails.cards;
    var calendars = orderFormDetails.calendars;

    if(cards.length == 0 && calendars.length == 0)
        return res.json({error:'No purchases have been made'});
    var job = await queueController.addPurchaseOrdersJob(classId);
    res.json({id:job.id});
}

exports.getGiveBackAmountDetailsForClassByClassId = async function(classId)
{
    // orders linked to a class
    var query = 'select distinct b.id, pv.name, pt.type, b.quantity as quantity, b.cost  from classes c ' +
        ' inner join productItems pi on pi.classFk = c.id ' + 
        ' inner join productVariants pv on pi.productVariantFk = pv.id ' + 
        ' inner join products p on pv.productFk = p.id ' +
        ' inner join productTypes pt on p.productTypeFk = pt.id ' +
        ' inner join basketItems b on b.productItemFk = pi.id ' + 
        ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' + 
        ' where pb.status = :completed ' + 
        ' and c.id = :classId ';
    
    var result = await models.sequelize.query(query,
    {replacements:{classId:classId, completed:'Completed'}, type: models.sequelize.QueryTypes.SELECT});

    var giveBackTotal = 0;
    var photoPackQuantity = 0;
    var photoPackGiveBack = 0;
    var photoTotalCost = 0
    var standardPackQuantity = 0;
    var standardPackGiveBack = 0;
    var standardTotalCost = 0;
    var calendarQuantity = 0;
    var calendarGiveBack = 0;
    var calendarTotalCost = 0;
    result.forEach(item =>{

        if(item.name == 'Photo Pack')
        {
            photoPackQuantity = photoPackQuantity + parseFloat(item.quantity);
            photoPackGiveBack = photoPackGiveBack + (parseFloat(item.quantity) * 0.8);
            photoTotalCost = photoTotalCost + parseFloat(item.cost);
        }
        else if(item.name == 'Standard')
        {
            standardPackQuantity = standardPackQuantity + parseFloat(item.quantity);
            standardPackGiveBack = standardPackGiveBack + (parseFloat(item.quantity) * 0.7);
            standardTotalCost = standardTotalCost + parseFloat(item.cost);
        }
        else if(item.type == 'Calendars')
        {
            calendarQuantity = calendarQuantity + parseFloat(item.quantity);
            calendarGiveBack = calendarGiveBack + (parseFloat(item.quantity) * 0.4);
            calendarTotalCost = calendarTotalCost + parseFloat(item.cost);
        }
    });

    giveBackTotal = photoPackGiveBack + standardPackGiveBack + calendarGiveBack;

    var array = {giveBackTotal: giveBackTotal.toFixed(2), photoPackGiveBack: photoPackGiveBack.toFixed(2),
                photoPackQuantity: photoPackQuantity.toFixed(0), photoPackGiveBackPer: 0.80, standardPackGiveBackPer: 0.70,
                standardPackGiveBack:standardPackGiveBack.toFixed(2),
                standardPackQuantity:standardPackQuantity.toFixed(0),
                calendarGiveBack:calendarGiveBack.toFixed(2),
                calendarQuantity:calendarQuantity.toFixed(0), calendarGiveBackPer: 0.40,
                calendarTotalCost:calendarTotalCost.toFixed(2), photoTotalCost:photoTotalCost.toFixed(2),
                standardTotalCost:standardTotalCost.toFixed(2)
            };
    
    return array;
}