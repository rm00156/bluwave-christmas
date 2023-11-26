var orderInstructionJobs = {};

$(document).ready(function(){
    $('#addNewClass').on('click', setUpAddNewClass);
    $('#submitNewClass').on('click', submitNewClass);
    $('#cancelNewClass').on('click', cancelNewClass);
   var classSize = $('#classSize').val();
   var orderClassSize = $('#orderClassSize').val();
   for( var i =0; i< classSize;i++)
   {
       $('#class'+i).on('click', selectClass);
   }

   for( var i =0; i< orderClassSize;i++)
   {
       $('#orderClass'+i).on('click', selectClass);
   }

   $('.nextStep').on('click', changeStep);
   $('#changeStep0').on('click', changeStep);
   $('#changeStep').on('click', changeStep);
   $('#deadLineButton').on('click', setupDeadline);
   $('#addClass').on('click', addClass);
   $('#editContactDetails').on('click', editContactDetails);
   $('#cancelDeadline').on('click', cancelDeadline);
   $('#setDeadLine').on('click', setDeadLine);
   $('#cancelStep').on('click', cancelStep);
   $('#switchClassOrders').on('click',switchClassOrders);
   $('#orderInstruction').on('click', orderInstruction);
   var dtToday = new Date();

    var month = dtToday.getMonth() + 1;
    var day = dtToday.getDate();
    var year = dtToday.getFullYear();

    if(month < 10)
        month = '0' + month.toString();
    if(day < 10)
        day = '0' + day.toString();

    var maxDate = year + '-' + month + '-' + day;    
    $('#deadLine').attr('min', maxDate);
    

    $('#classes').DataTable({ searching: false,lengthChange:false});
    $('#orderClasses').DataTable();
    setInterval(updateOrderInstructionJobs,1000);

});

function switchClassOrders(e)
{
    var buttonText= $('#switchClassOrders').text();

    if(buttonText == 'Classes With Orders')
    {
        $('#allClasses').attr('style','display:none');
        $('#classesWithOrders').attr('style','');
        
        $('#switchClassOrders').text('All Classes');
    }
    else
    {
        $('#allClasses').attr('style','');
        $('#classesWithOrders').attr('style','display:none');
        $('#switchClassOrders').text('Classes With Orders');
    }
    
}

function setDeadLine(e)
{
    var schoolId = e.currentTarget.getAttribute("data-schoolId");
    var schoolNumber = e.currentTarget.getAttribute("data-schoolNumber");
    var date = $('#deadLine').val();
    
    if(date == '')
    {
        $('#deadLineError').text('Please select a date before setting deadline');
    }
    else
    {
        var data = {schoolId:schoolId, deadLineDttm:date};
        $.ajax({
            type: "post",
            url:"/setDeadLine",
            data:data,
            dataType: "json",
            success: function(data)
            {
                window.location = '/new_school_details?number=' + schoolNumber;
                // var now = Date.now();
                //  date = new Date(date);
               
                // daysLeft = date - now;
                // console.log(date.getTime());
                // console.log(daysLeft);
                // daysLeft = Math.round(daysLeft/(1000*60*60*24));
                // $('#daysLeft').text(daysLeft + ' Days till deadline');
                // $('#deadLineError').text('');
            }
        })
      
    }

}
function cancelDeadline()
{
    $('#overlay2').attr('style','display:none');
}

function editContactDetails(e)
{
    var schoolId = e.currentTarget.getAttribute('data-schoolId');
    window.location = '/editContactDetails?schoolId='+schoolId;
}

function selectClass(e)
{
    console.log(e);
    var classNumber =  e.currentTarget.getAttribute("data-classnumber");
    window.location = '/class?classNumber=' + classNumber;    
}


function setupDeadline()
{
    $('#overlay2').attr('style','display:block');
}


function changeStep(e)
{
    var schoolId = e.currentTarget.getAttribute("data-schoolid");
    var schoolNumber = e.currentTarget.getAttribute("data-schoolNumber");
    var nextTypeFk = e.currentTarget.getAttribute("data-nextTypeFk");
    var data ={schoolId:schoolId, nextTypeFk:nextTypeFk};

    $.ajax({
        type: "post",
        url:"/changeSchoolStep",
        data:data,
        dataType: "json",
        success: function(data)
        {
            var statusDetail = data.statusDetail;
            
            if(statusDetail.type == 'Waiting for Customer Response')
            {
                $('#overlay3').attr('style','display:block;z-index:55')
            }
            else
            {
                window.location = '/new_school_details?number=' + schoolNumber;
            }
        }
    })
}

function addClass(e)
{
    var schoolId = e.currentTarget.getAttribute("data-schoolId");
    var yearId = e.currentTarget.getAttribute("data-yearId");
    var className = $('#class').val();
    const style = 'text-align:left;margin-top:0;margin-bottom:5px';
    if( className == '' )
    {
        $('#error').attr('style',style);
        $('#error').text('Please enter a class before trying to add');
    }
    else
    {
        var data ={schoolId:schoolId,yearId:yearId, className:className};
        $.ajax({
            type: "post",
            url:"/createClass",
            data:data,
            dataType: "json",
            success: function(data)
            {
                if(data.errors)
                {
                    // display error
                    $('#error').attr('style',style);
                    $('#error').text('This class has already been added');
                }
                else
                {
                    window.location ='/school?id=' + schoolId;    
                }
            }
        })
    }
    
}

function cancelStep()
{
    $('#overlay3').attr('style', 'display:none')
}

function orderInstruction(e)
{
    var schoolId = e.currentTarget.getAttribute('data-schoolid');
    
    $.ajax({
        url:'/getSchoolOrderInstruction',
        type:'get',
        data:{schoolId:schoolId},
        success:function(job)
        {
            if(!job.error)
            {
                $('#overlay4').attr('style','display:block;z-index:55'); 
                $('#progressText').text('Generating Proofs for School ' +  + ' ....');
                orderInstructionJobs[job.id] = {id: job.id, state: "queued"};
                $('#error').text('');
            }
            else
            {
                $('#error').text(job.error);
            }
        }
    })
}

function updateOrderInstructionJobs() {
    var classSize = $('#classSize').val();
    classSize = parseFloat(classSize);

    for (var id of Object.keys(orderInstructionJobs)) {
        var data = {id:id};
        $.ajax({
            type:'get',
            url:'/createSchoolOrderInstructionJob',
            data:data,
            success:function(result){
                if(result.process == 'schoolOrderInstruction')
                {
                  var progress = result.progress;
                  var totalSteps = ((5 * classSize) + 4).toFixed(0);
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  console.log(totalSteps);
                  console.log(result.instructionPath);
                  if(progress == totalSteps && result.instructionPath != undefined)
                  {
                    var jobId = result.id;
                    $('#overlay4').attr('style','display:none');
                    $('#progress').attr('style','height:25px;width:' + 0 + '%');
                    $('#progress').text(0 + '%');
                    delete orderInstructionJobs[jobId];
                    window.location = result.instructionPath;
                           
                  }
                }
            }
        })   
    }
  }

function setUpAddNewClass()
{
    $('#overlay').attr('style','display:block');
}

function submitNewClass(e)
{
    var className = $('#newClass').val();
    var schoolId = e.currentTarget.getAttribute('data-schoolId');
    var schoolNumber = e.currentTarget.getAttribute('data-schoolNumber');
    if(className == '')
    {
        $('#errorClass').text('Please enter a value');
        return;
    }
        

    $.ajax({
        type:'post',
        url: '/addNewClass',
        data:{className:className, schoolId:schoolId},
        success:function(data)
        {
            if(data.errors)
            {
                $('#errorClass').text('A class with this name already exists');
                return;
            }
            
            window.location = '/new_school_details?number=' + schoolNumber;
        }
    })
}

function cancelNewClass()
{
    $('#newClass').val('');
    $('#overlay').attr('style','display:none');
}