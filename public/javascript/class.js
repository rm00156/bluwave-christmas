var jobs = {};
var proofJobs = {};
var printFormJobs = {};
var purchaseJobs = {};
var orderInstructionJobs = {};
var table;

$(document).ready(function(){

    $('#generatePurchasedOrders').on('click', generatePurchasedOrders);
    $('#generateOrderForms').on('click', generateOrderForms);
    $('#createOrderInstructions').on('click', createOrderInstructions);
    $('#createProof').on('click', createProofs2);
    $('#kidOrderButton').on('click', switchKidOrders);
    $('#viewProof').on('click', viewProofs);
    $('#viewPurchaseCards').on('click', viewPurchaseCards);
    $('#editCards').on('click', editCards);
    $('#schoolButton').on('click', gotToSchool);
    $('#generatePrintForm').on('click', generatePrintForm);
    $('#orderTable').DataTable({
            dom: 'Bfrtip',
            buttons: [
            {
                 extend: 'csv',
                    //Name the CSV
                    filename: $('#className').val() + '_Orders', 
            }]
        } );
    table = $('#kidsTable').DataTable();


    $('#kidsTable tbody').on('click', 'tr',function(){
        var row = table.row(this).data();
        var kidCode = $('#'+row['DT_RowId']).attr('data-code');
        window.location = '/kidProductItems?kidNumber=' + kidCode;
    }); 

    // $('#kidsTable_length select').on('click', reece);
     $('#createCards').on('click', createCards);
     $('#editClassName').on('click', editClassName);
     $('#cancel').on('click',removeOverlay);
     $('#updateName').on('click',updateClassName);

     $('#form').submit(function(e){

        e.preventDefault();

        addKid();

     })
    //  $('#addKid').on('click',addKid);
     setInterval(updateJobs, 1000);
     setInterval(updateProofJobs,1000);
     setInterval(updatePrintFormJobs,1000);
     setInterval(updatePurchaseJobs,1000);
     setInterval(updateOrderInstructionJobs,1000);
     setInterval(updatePurchaseOrdersJobs,1000);
})

function generateOrderForms(e)
{
    var classId = e.currentTarget.getAttribute('data-classId');

    $.ajax({
        type:'post',
        url:'/generateOrderForms',
        data:{classId:classId},
        success:function(job)
        {
            if(job.error == null)
            {
                $('#error').text('');
                $('#overlay2').attr('style','display:block; z-index:55');
                $('#progressText').text('Generating Print Form for class ' + ' ....');
                printFormJobs[job.id]= {id: job.id, state: "queued"};
                // window.location = data.form;
            }
            else
            {
              $('#error').text(job.error);
            }
        }
    })
}

function updateClassName(e)
{
    var currentName = e.currentTarget.getAttribute('data-className');
    var newName = $('#newClassName').val();

    if(currentName == newName)
    {
        $('#nameError').text('Please change the name before trying to update');
    }
    else
    {
        var classId = e.currentTarget.getAttribute('data-classId');
        var schoolId = e.currentTarget.getAttribute('data-schoolId');
        var data = {classId:classId, newName:newName, schoolId:schoolId};
        $.ajax({
            type:'post',
            url:'/editClassName',
            data:data,
            success:function(data)
            {
                var error = data.error;

                if(error)
                {
                    $('#nameError').text(error);
                }
                else
                {
                    window.location = '/class?id='+ classId;
                }
            }
        })
    }

}

function removeOverlay()
{
    $('#overlay2').attr('style','display:none');
}

function editClassName(e)
{
    var currentName = $('#editClassName').html();
    if( currentName != 'Individual Class' )
    {
        $('#nameError').text('');
        $('#overlay2').attr('style','display:block; z-index:55');
    }
    
}

function createCards(e)
{
    var classId =(e.currentTarget.getAttribute('data-classId'));
    var data = {classId:classId};

    $.ajax({
        type:'post',
        url:'/createCardsForClass',
        data:data,
        success:function(job)
        {
            if(job.errors)
            {
                $('#error').text(job.errors);
            }
            else
            {
                $('#overlay').attr('style','display:block')
                $('#progressText').text('Generating Cards for class ' + $('#className').val() + ' ....');
                jobs[job.id] = {id: job.id, state: "queued", totalSteps:job.totalSteps, classId:job.classId};

            }
        }
    })
}

function updateJobs() {
    
    for (var id of Object.keys(jobs)) {
        var data = {id:id};
        $.ajax({
            type:"get",
            url:'/createCardsForClass',
            data:data,
            success:function(result){
                if(result.process== 'createCards')
                {
                    var progress = result.progress;
                    var totalSteps = jobs[result.id].totalSteps
            
                    var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                    $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                    $('#progress').text(progressAsPercentage + '%');
            
                    if(progress == totalSteps)
                    {
                    var jobId = result.id;
                    $('#overlay').attr('style','display:block;z-index:55');
                    window.location = '/viewCreatedCards?classId=' + jobs[result.id].classId +'&selectedIndex=0';
                        delete jobs[jobId];
                        
                    }
                }
            }
        })
    }
  }

function updateProofJobs() {
    for (var id of Object.keys(proofJobs)) {
        var data = {id:id};
        $.ajax({
            type:'get',
            url:'/createProofsForClass',
            data:data,
            success:function(result){
                if(result.process == 'proof')
                {
                  var progress = result.progress;
                  var totalSteps = 7;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  console.log(totalSteps);
                  if(progress == totalSteps && result.samplePath != undefined)
                  {
                    var jobId = result.id;
                    $('#overlay').attr('style','display:none');
                    $('#progress').attr('style','height:25px;width:' + 0 + '%');
                    $('#progress').text(0 + '%');
                    delete proofJobs[jobId];
                    window.location = result.samplePath;
                           
                  }
                }
            }
        })   
    }
  }

function updatePrintFormJobs() {
    for (var id of Object.keys(printFormJobs)) {
        var data = {id:id};

        $.ajax({
            type:'get',
            url:'/createPrintForm',
            data:data,
            success:function(result)
            {
                if(result.process == 'ordersForm')
                {
          
                  var progress = result.progress;
                  var totalSteps = 7;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  if(progress == totalSteps && result.form != undefined)
                  {
                    var jobId = result.id;
                    $('#overlay2').attr('style','display:none');
                    $('#progress').attr('style','height:25px;width:' + 0 + '%');
                    $('#progress').text(0 + '%');
                    delete printFormJobs[jobId];
                    window.location = result.form;
                           
                  }
                }
            }
        })
    }
  }

  
function updatePurchaseJobs() {
    for (var id of Object.keys(purchaseJobs)) {
        var data = {id:id};

        $.ajax({
            type:'get',
            url:'/updatePurchaseJobs',
            data:data,
            success:function(result)
            {
                if(result.process == 'purchasedCards')
                {
          
                  var progress = result.progress;
                  var totalSteps = 5;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  if(progress == totalSteps && result.path != undefined)
                  {
                    var jobId = result.id;
                    $('#overlay').attr('style','display:none');
                    $('#progress').attr('style','height:25px;width:' + 0 + '%');
                    $('#progress').text(0 + '%');
                    delete purchaseJobs[jobId];
                    window.location = result.path;
                           
                  }
                }
            }
        })
    }
  }
  

function generatePrintForm(e)
{
    var classId = e.currentTarget.getAttribute('data-classId');

    var data = {classId:classId};
    $.ajax({

        type:"post",
        url:'/generatePrintForm',
        data:data,
        success:function(job)
        {
            if(job.errors == null)
            {
                $('#error').text('');
                $('#overlay').attr('style','display:block');
                $('#progressText').text('Generating Print Form for class ' + $('#className').val() + ' ....');
                printFormJobs[job.id]= {id: job.id, state: "queued"};
                // window.location = data.form;
            }
            else
            {
              
              $('#error').text(job.errors);
            }
        }
    })
}

function gotToSchool(e)
{
    const schoolId = e.currentTarget.getAttribute('data-schoolId');
    window.location = '/school?id='+schoolId;
}

function createProof(e)
{
    var classId = e.currentTarget.getAttribute("data-classId");
    var className = e.currentTarget.getAttribute("data-className");
    var data = {classId:classId, className:className};
    $.ajax({
        type: "get",
        url:"/printScreen",
        data:data,
        dataType: "json",
        success: function(data)
        {
            var path = data.samplePath;
            window.location = '/printScreen?samplePath=' +path;
        }
    })
}

function createProofs2(e)
{
    var classId = e.currentTarget.getAttribute("data-classId");
    var className = e.currentTarget.getAttribute("data-className");
     var data = {classId:classId,className:className};
    $.ajax({
        xhr: function()
        {
          var xhr = new XMLHttpRequest();
          //Upload progress
  
          return xhr;
        },
        type: 'POST',
        url: "/createProofs",
        data: data,

        success:function(job)
        {
        
            if(!job.errorType)
            {
                $('#overlay').attr('style','display:block'); 
                $('#progressText').text('Generating Proofs for class ' + $('#className').val() + ' ....');
                proofJobs[job.id] = {id: job.id, state: "queued"};
                $('#error').text('');
                
            }
            else
            {
                if(job.errorType == 'cards')
                {
                    $('#error').text('No cards have been created, or there are no kids in this class.');
                }
                else if( job.errorType == 'deadline')
                {
                    $('#error').text('The deadline for this school has not been set. Please set the deadline for the school before trying to create proofs');
                }
                
                }
            
        }
      });
}

function switchKidOrders(e)
{
     var displayKid =  $('#displayKid').val();
    console.log(displayKid)
     if(displayKid == 'true')
     {
        $('#kids').attr('style','display:none');
        $('#orders').attr('style','padding:10px');
        $('#displayKid').val("false");
        $('#kidOrderButton').text('View Kids');
     }
     else
     {
        $('#kids').attr('style','height:35% ');
        $('#orders').attr('style','display:none');
        $('#displayKid').val("true");
        $('#kidOrderButton').text('View Orders');
     }
}

const addKid = function(e)
{
    const classId=$('#classId').val();
    var data = new FormData();
    var request = new XMLHttpRequest();

    request.responseType = 'json';
    data.append('displaySchool',$('#displaySchool').is(':checked'));
    data.append('displayClass', $('#displayClass').is(':checked'));
    data.append('displayAge', $('#displayAge').is(':checked'));
    data.append('name', $('#name').val());
    data.append('age', $('#age').val());
    data.append('month', $('#month').val());
    // data.append('code', $('#code').val());
    data.append('classId', classId);
    data.append('artwork', $('#artwork').prop('files')[0]);

    request.addEventListener('load', function(e){

        var data = request.response;

        var errors = data.errors;
        var query = '';
        if(errors)
        {   
            if(errors.code)
            {
                query = query + '&errorCode=' +errors.code;
            }

            if(errors.artwork)
            {
                query = query + '&errorArtwork=' +errors.artwork;
            }
        }
        console.log('/class?id='+classId + query);
             window.location = '/class?id='+classId + query;
        
    });

    request.open('post','/addKid');
    request.send(data);
}


function viewProofs(e)
{
    var classId = e.currentTarget.getAttribute("data-classId");
    console.log(classId);
    var data = {classId:classId};
    $.ajax({
        type: "get",
        url:"/viewProofs",
        data:data,
        dataType: "json",
        success: function(data)
        {
            console.log(data);
            var errors = data.errors;
           if(errors)
           {
                $('#error').text(errors.viewProofs);
           }
           else
           {
            var path = data.proofPath;
            window.location = path;
           }
        }
    })
}

function viewPurchaseCards(e)
{
    var classId = e.currentTarget.getAttribute("data-classId");
    console.log(classId);
    var data = {classId:classId};
    $.ajax({
        type: "get",
        url:"/generatePurchasedCards",
        data:data,
        dataType: "json",
        success: function(job)
        {
            
            var errors = job.errors;
           if(errors)
           {
                $('#error').text(errors);
           }
           else
           {
            $('#overlay').attr('style','display:block')
            $('#progressText').text('Generating Purchased Cards for class ' + $('#className').val() + ' ....');
           
                purchaseJobs[job.id] = {id: job.id, state: "queued"};
           }
        }
    })
}


function editCards(e)
{
    var classId = e.currentTarget.getAttribute("data-classId");
    console.log(classId);
    var data = {classId:classId};
    $.ajax({
        type: "get",
        url:"/editCards",
        data:data,
        dataType: "json",
        success: function(data)
        {
            var errors = data.errors;
            if(errors)
            {
                 $('#error').text(errors.editCards);
            }
            else
            {
                window.location = '/viewCreatedCards?classId=' +classId +'&selectedIndex=0';
            }
        }
    })
}

function generatePurchasedOrders(e)
{
    var classId = e.currentTarget.getAttribute("data-classId");

    $.ajax({
        type:'post',
        url:'/generatePurchasedOrders',
        data:{classId:classId},
        success:function(job)
        {
            if(!job.error)
            {
                $('#overlay2').attr('style','display:block;z-index:55'); 
                $('#progressText').text('Generating Proofs for class ' + $('#className').val() + ' ....');
                purchaseJobs[job.id] = {id: job.id, state: "queued"};
                $('#error').text('');
            }
            else
            {
                $('#error').text(job.error);
            }
        }
    })
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
                $('#progressText').text('Generating Proofs for class ' + $('#className').val() + ' ....');
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

function updatePurchaseOrdersJobs() {
    for (var id of Object.keys(purchaseJobs)) {
        var data = {id:id};
        $.ajax({
            type:'get',
            url:'/createOrderInstructionJob',
            data:data,
            success:function(result){
                if(result.process == 'purchasedOrders')
                {
                  var progress = result.progress;
                  var totalSteps = 8;
            
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
                    delete purchaseJobs[jobId];
                    window.location = result.instructionPath;
                           
                  }
                }
            }
        })   
    }
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