const Queue = require('bull');
const REDIS_URL = /*process.env.REDIS_URL*/ process.env.STACKHERO_REDIS_URL_TLS  || 'redis://127.0.0.1:6379';
const redis = require('redis');

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
const workerQueue = new Queue('worker', client );


exports.addClassOrderInstructionJob = async function(classId, deadlineId)
{
    return await workerQueue.add({process:'classOrderInstruction', classId:classId, deadlineId:deadlineId});
}

exports.addSchoolOrderInstructionJob = async function(schoolId)
{
    return await workerQueue.add({process:'schoolOrderInstruction', schoolId:schoolId});
}

exports.getJobId = async function(id)
{
    return await workerQueue.getJob(id);
}

exports.addJob = async function(process)
{
    return await workerQueue.add({process:process});
}

exports.addPurchaseEmailJob = async function(process,basketItems, orderNumber, date, total,time)
{
    return await workerQueue.add({process:process, basketItems:basketItems, orderNumber:orderNumber, date:date, total:total, time:time});
}

exports.addFormJob = async function(classId,purchasedCardDetails,numberOfPurchasedItems,purchasedExtras)
{
    return await workerQueue.add({process:'form',classId:classId,purchasedCardDetails:purchasedCardDetails,
    numberOfPurchasedItems:numberOfPurchasedItems,purchasedExtras:purchasedExtras});
}

exports.addCreateClassJob = async function(classId)
{
    return await workerQueue.add({classId:classId,process:'createCards'});
}

exports.addUpdateCardJob = async function(classFk,kidId,age,name,displaySchool,displayClass, displayAge,files)
{
    return await workerQueue.add({process:'updateCard',classFk:classFk,
        kidId:kidId,age:age,name:name,displaySchool:displaySchool,displayClass:displayClass, displayAge:displayAge,files});
}

exports.updateCalendarJob = async function(kidId,calendarId)
{
    return await workerQueue.add({process:'updateCalendar',kidId:kidId,calendarId:calendarId});
}

exports.updateProductItemJob = async function(productItemId)
{
    return await workerQueue.add({process:'updateProductItem',productItemId:productItemId});
}

exports.addArtworkPicJob = async function(kidId,name, age,displaySchool,month,displayClass,displayAge,file)
{
    return await workerQueue.add({process:'artworkPic',kidId:kidId,name:name,
        age:age,displaySchool:displaySchool,month:month,
            displayClass:displayClass,displayAge:displayAge,file:file});
}

exports.addCreateCardAminJob = async function(kidId)
{
    return await workerQueue.add({process:'createCardAdmin',kidId:kidId});
}

exports.addResetEmailJob = async function(email)
{
    await workerQueue.add({process:'resetEmail', email:email});
}

exports.addPurchaseCardsJob = async function(classId,purchasedBasketItems)
{
    return await workerQueue.add({process:'purchasedCards',classId:classId, purchasedBasketItems:purchasedBasketItems});
}

exports.addSendConfirmationDetailEmailJob = async function(school,name,bankAcc,sortCode,type)
{
    await workerQueue.add({process:'sendConfirmDetailsEmail',school:school,name:name,bankAcc:bankAcc,
        sortCode:sortCode,type:type});
}

exports.addProofJob = async function(kids,classId,year,className,schoolName)
{
    return await workerQueue.add({process:'proof', kids:kids,classId:classId,year:year,className:className,
                                                schoolName:schoolName,samplePath:undefined});
}

exports.addUploadAndGenerateJob = async function(productItemId, pictureNumber, productId, files)
{
    return await workerQueue.add({process:'uploadAndGenerate', productItemId:productItemId, pictureNumber: pictureNumber,
            productId:productId, files: files});
}

exports.addUpdateAndGenerateJob = async function(productItemId,productId, name, age, month,
    displaySchool, displayClass,displayAge)
{
    return await workerQueue.add({process:'updateAndGenerate', productItemId:productItemId,
        productId:productId, name:name, age: age, month: month,
        displaySchool: displaySchool, displayClass:displayClass, displayAge:displayAge});

}

exports.addParentRegistrationEmailJob = async function(email)
{
    await workerQueue.add({process:'parentRegistrationEmail',email:email}); 
}

exports.addParentRegistrationBluwaveEmailJob = async function(email, telephoneNo, name)
{
    await workerQueue.add({process:'parentRegistrationEmailToBluwave',email:email,telephoneNo:telephoneNo,name:name});
}

exports.addOrganiserRegistrationEmailJob = async function(email, school, name)
{
    await workerQueue.add({process:'organiserRegistrationEmail',email:email,school:school,name:name});
}

exports.addOrganiserRegistrationBluwaveEmailJob = async function(school, account , name, numberOfClasses)
{
    await workerQueue.add({process:'organiserRegistrationEmailToBluwave',school:school,account:account,name:name, numberOfClasses:numberOfClasses});
}

exports.addOrderFormJob = async function(classId)
{
    return await workerQueue.add({process:'ordersForm', classId:classId});
}

exports.addPurchaseOrdersJob = async function(classId)
{
    return await workerQueue.add({process:'purchasedOrders', classId:classId});
}

exports.generateOrderDetailsJob = async function(purchaseBasketId)
{
    return await workerQueue.add({process:'generateOrderDetails', purchaseBasketId:purchaseBasketId});
}

exports.linkKidJob = async function(name, years, months,classId, account)
{
    return await workerQueue.add({process:'linkKid', name:name, years:years, months:months, classId:classId, account:account});
}