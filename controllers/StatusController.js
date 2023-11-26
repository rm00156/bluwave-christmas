const models = require('../models');

exports.getAllStatusTypes = async function()
{
    return await getAllStatusTypes();
}

async function getAllStatusTypes()
{
    return await models.statusType.findAll({
        where:{
            deleteFl: false
        },
        order:[['id','ASC']]
    })
}

exports.getStatusTypeDetailsForSchoolId = async function(schoolId)
{
    var statusTypes = await getAllStatusTypes();

    var statusTypeDetails = new Array();

    for(var i = 0; i < statusTypes.length; i++)
    {
        var statusType = statusTypes[i];

        // is get status by status type for school
        var status = await getStatusAtStatusTypeForSchoolId(schoolId, statusType.id);
        var statusTypeDetail =
        {
            statusType: statusType.type,
            createdDttm: status ? status.createdDttm : null,
            reached: status ? true : false
        }

        statusTypeDetails.push(statusTypeDetail);
    }

    var reachedStatuses = statusTypeDetails.filter(o => o.reached);
    var reachedStatusCount = reachedStatuses.length;

    return {
            statusTypeDetails: statusTypeDetails,
            reachedStatusCount: reachedStatusCount };
}


async function getStatusAtStatusTypeForSchoolId(schoolId, statusTypeId)
{
    return await models.status.findOne({
        where:{
            statusTypeFk: statusTypeId,
            schoolFk: schoolId,
            deleteFl: false
        },
        order:[['createdDttm', 'DESC']]
    });
}

exports.changeToPrintStatus = async function(schoolId,organiser)
{
    await models.status.create({
        schoolFk:schoolId,
        statusTypeFk:7,
        createdDttm: Date.now(),
    });

    if(organiser == true)
    {
        await models.deadLine.update({
            continueFl:true
        },
        {
            where:{
                schoolFk:schoolId
                }
        })
    }
}
