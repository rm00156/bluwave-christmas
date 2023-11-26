
var orderInstructionJobs = {};

$(document).ready(function(){

    var numberOfKids = $('#numberOfKids').val();

    for( var i = 0; i < numberOfKids; i++)
    {
        $('#kid' + i).on('click', navigate);
    }

    $('#createOrderInstructions').on('click', createOrderInstructions);
    setInterval(updateOrderInstructionJobs,1000);

})

function navigate(e)
{
    var kidNumber = e.currentTarget.getAttribute('data-kidNumber');
    console.log(kidNumber)
    $.ajax({
        type:'get',
        url: '/getAccountIdForKidNumber',
        data:{kidNumber:kidNumber},
        success:function(data)
        {
            var accountId = data.accountId;

            if(!(accountId == null || accountId == undefined))
                window.location = '/parentOrders?accountId=' + accountId;
        }
    });
}

function createOrderInstructions(e)
{
    var classId = e.currentTarget.getAttribute("data-classId");

    $.ajax({
        type:'get',
        url:'/getClassOrderInstruction',
        data:{classId:classId},
        success:function(job)
        {
            if(!job.error)
            {
                $('#overlay2').attr('style','display:block;z-index:55'); 
                $('#progressText').text('Generating Proofs for class ....');
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
    for (var id of Object.keys(orderInstructionJobs)) {
        var data = {id:id};
        $.ajax({
            type:'get',
            url:'/createOrderInstructionJob',
            data:data,
            success:function(result){
                if(result.process == 'classOrderInstruction')
                {
                  var progress = result.progress;
                  var totalSteps = 6;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  console.log(totalSteps);
                  if(progress == totalSteps && result.instructionPath != undefined)
                  {
                    var jobId = result.id;
                    $('#overlay2').attr('style','display:none');
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