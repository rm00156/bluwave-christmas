var jobs = {};
$(document).ready(function(){

    $('#updateCard').on('click', updateCard);
    
    setInterval(updateJobs, 1000);
})


const selectCard = function(e)
{
    var cardPath = e.currentTarget.getAttribute("data-path");
    var cardId = e.currentTarget.getAttribute("data-cardId");
    var cardIndex = e.currentTarget.getAttribute("id");
    var classId = e.currentTarget.getAttribute("data-classId");
    // console.log( e.currentTarget);
    $.ajax({
        type: "get",
        url:"/selectPreviewCard",
        data:{id:cardId},
        dataType: "json",
        success: function(data)
        {
            $('#progress').attr('style','height:25px;width:' + 0 + '%');
      $('#progress').text(0 + '%');
            window.location = '/viewCreatedCards?classId=' +classId +'&selectedIndex='+ cardIndex;
  
         }
    });
  
}


function updateJobs() {
    for (var id of Object.keys(jobs)) {
        var data = {id:id};

        $.ajax({
            type:'get',
            url:'/updateCardJobs',
            data:data,
            success:function(result)
            {
                if(result.process == 'updateCard')
                {console.log('thierry')
    
                  var progress = result.progress;
                  var totalSteps = 8;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  if(progress == totalSteps)
                  {
                    var jobId = result.id;
                    $('#overlay').attr('style','display:none');
                    window.location = '/viewCreatedCards?classId=' + jobs[result.id].classId + '&selectedIndex='+ jobs[result.id].selectedCardIndex;
                        delete jobs[jobId];
                       
                  }
                } 
            }
        })
    }
  }


const updateCard = function(e)
{
    $('#overlay').attr('style','display:block')
var data = new FormData();
var request = new XMLHttpRequest();
var classId = e.currentTarget.getAttribute('data-classId');
var selectedCardIndex = $('#selectedCardIndex').val();
 request.responseType = 'json';
 data.append('file2', $('#artwork').prop('files')[0]);
 data.append('classId',classId);
 data.append('selectedCardId',$('#selectedCardId').val());
 data.append('selectedCardIndex',selectedCardIndex);
 data.append('schoolDropdown',$('#schoolDropDown').val());
 data.append('schoolCheckBox', $('#schoolCheckBox').is(':checked'));
 data.append('classCheckBox', $('#classCheckBox').is(':checked'));
 data.append('ageCheckBox', $('#ageCheckBox').is(':checked'));
 data.append('name', $('#updateName').val());
 data.append('age', $('#updateAge').val());
 data.append('selectedKidId',$('#selectedKidId').val());
 request.addEventListener('load', function(e){

    var job  = request.response;
    jobs[job.id] = {id: job.id, state: "queued", selectedCardIndex:job.selectedCardIndex, classId:job.classId};

     } )
 // add a progress bar of some sort
 request.open('post','/updateCard');
 request.send(data);

}