var kidJobs = {};
var picArtworkJobs = {};
var calendarPicJobs = {};
var basic;
var view;
var currentUploadPicSet = false;
var orientation = 'landscape';
var color = 'red';
var jobs = {};
var proofJobs = {};
$(document).ready(function(){

    var card = $('#card').val();
    if(card == 'null')
    {
        $('#mainCanvas').attr('style','display:none');
        $('#noCard').attr('style','');
    }
    else
    {
        $('#mainCanvas').attr('style','');
        $('#noCard').attr('style','display:none');
    }
    $('#orderTable').DataTable();

    $('#createUpdateCard').on('click', createUpdateCard);
    $('#updateCalendar').on('click',updateCalendar);
    $('#class').on('click', goToClass);

    $('#generateCard').on('click', generateCard);
    $('#generateCalendar').on('click',generateCalendar);

    $('#cardButton').on('click',printCard);
    $('#proofButton').on('click',printProof);
    // $('#deleteKid').on('click',deleteKid);
    $('#switchView').on('click', switchView);

    $('#addToBasket').on('click',addToBasket);
    $('#quantity').on('change',quantityChange);
    $('#uploadPicture').on('click', uploadPicture);
    $('#uploadArtwork').on('click', uploadArtwork);

    $('#uploadCalendarPicture').on('click', uploadCalendarPicture);
    $('#cancel').on('click', cancel);
    // $('#landscape').on('click', setOrientation);
    // $('#portrait').on('click', setOrientation);

    $('#landscape').on('click', selectOrientation);
    $('#portrait').on('click', selectOrientation);
    $('#red').on('click', selectColor);
    $('#blue').on('click', selectColor);
    $('#green').on('click', selectColor);

    // $('#red').on('click', setColor);
    // $('#blue').on('click', setColor);
    // $('#green').on('click', setColor);

    var selectedPackage = $('#selectedPackage').val();
    var packageOptions =  $('#packageOptions');
    if(selectedPackage != null)
    {
        packageOptions.val(selectedPackage);
    }
    packageOptions.on('change', selectPackage);

    $('#sItem1').on('click',selectPackage2);
    $('#sItem2').on('click',selectPackage2);
    $('#sItem3').on('click',selectPackage2);
    $('#button').on('click', confirmPicture);

    if($('#calendar').val() == undefined)
        tempMethod();
    
    if(selectedPackage == 1 || selectedPackage == 2 )
        displayCard();
    else
        displayCalendar2();
            

    $('#createProof').on('click', createProof);
    setInterval(updateJobs, 1000);
    setInterval(updatePicArtworkJobs,1000);
    setInterval(updateCalendarJobs, 1000);
    setInterval(updateProofJobs,1000);
    
    // document.getElementById('current').innerHTML = "Standard Pack: Edit Options";
})

function updateProofJobs() {
    for (var id of Object.keys(proofJobs)) {
        var data = {id:id};
        $.ajax({
            type:'get',
            url:'/createProofJob',
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


function setColor(e)
{
    color = e.currentTarget.getAttribute('data-color');
    displayCalendar();
}

function setOrientation(e)
{
    orientation = e.currentTarget.getAttribute('data-orientation');
    displayCalendar();
}

function selectColor(e)
{
    var kidId = $('#kid').val();
    var orientation = $('#orientation').val()
    var color =e.currentTarget.getAttribute('data-color');
    var selectedPackage = $('#selectedPackage').val();
    window.location = '/kid?id=' + kidId + '&selectedPackage=' + selectedPackage + '&color='+ color + '&orientation=' + orientation;
}

function selectOrientation(e)
{
    var kidId = $('#kid').val();
    var orientation = e.currentTarget.getAttribute('data-orientation');
    var color = $('#color').val();
    console.log(color);
    var selectedPackage = $('#selectedPackage').val();
    window.location = '/kid?id=' + kidId + '&selectedPackage=' + selectedPackage + '&color='+ color + '&orientation=' + orientation;
}

function displayCalendar2()
{
    var calendarId = $('#calendar').val();
    var orientation = $('#orientation').val();
    var color = $('#color').val();
    var data ={calendarId:calendarId,orientation:orientation,color:color};

    $.ajax({
        type:'get',
        url:'/getCalendar2',
        data:data,
        success:function(data)
        {
            var calendarPath = data.calendarPath;
            var canvas = data.canvas;

            pdfjsLib.getDocument(calendarPath)
                    .then(function(doc){
                doc.getPage(1).then(function(page){
                        var myCanvas= document.getElementById(canvas);
                        var context = myCanvas.getContext("2d");
                        
                        // 1 means the original size of the page
                        
                        var viewport= page.getViewport(3);
                        myCanvas.height = viewport.height;
                        myCanvas.width = viewport.width;
                page.render({
                        canvasContext:context,
                        viewport:viewport
                    })
    
                    })
                    });
        }
    })
}



function displayCalendar()
{
    var calendarId = $('#calendar').val();
    var data ={calendarId:calendarId};
    console.log(calendarId);
    // selected color
    // trigger the def red one on default, portrait
    $.ajax({
        type:'get',
        url:'/getCalendar',
        data:data,
        success:function(data)
        {
            var accountType = data.accountType;

            console.log(data);
            var calendar = data.calendar;
            var canvas;
            var calendarPath;
            
            if(accountType == 1)
            {
                if(orientation == 'portrait')
                {   
                    if(color == 'red')
                        calendarPath = calendar.portraitRedPath;
                    else if(color == 'blue')
                        calendarPath = calendar.portraitBluePath;
                    else
                        calendarPath = calendar.portraitGreenPath;
                }
                else
                {
                    if(color == 'red')
                        calendarPath = calendar.landscapeRedPath;
                    else if(color == 'blue')
                        calendarPath = calendar.landscapeBluePath;
                    else
                        calendarPath = calendar.landscapeGreenPath;
                }
                canvas = 'mainCanvas';
            }
            else
            {
                if(orientation == 'portrait')
                {
                    if(color == 'red')
                        calendarPath = calendar.portraitRedPathPreview;
                    else if(color == 'blue')
                        calendarPath = calendar.portraitBluePathPreview;
                    else
                        calendarPath = calendar.portraitGreenPathPreview;
                }
                else
                {
                    if(color == 'red')
                        calendarPath = calendar.landscapeRedPathPreview;
                    else if(color == 'blue')
                        calendarPath = calendar.landscapeBluePathPreview;
                    else
                        calendarPath = calendar.landscapeGreenPathPreview;
                }
                canvas = 'parentCanvas';
            }

            pdfjsLib.getDocument(calendarPath)
                    .then(function(doc){
                doc.getPage(1).then(function(page){
                        var myCanvas= document.getElementById(canvas);
                        var context = myCanvas.getContext("2d");
                        
                        // 1 means the original size of the page
                        
                        var viewport= page.getViewport(1);
                        myCanvas.height = viewport.height;
                        myCanvas.width = viewport.width;
                page.render({
                        canvasContext:context,
                        viewport:viewport
                    })
    
                    })
                    });
        }
    })
}

function cancel(e)
{
    basic.destroy();
    $('#uploadPictureCrop').empty();
    
    $('#package2View').attr('style','display:none');

    if($('#calendar').val() == undefined )
    {
        $('#pictureView').attr('style','display:none');
        $('#picture').attr('disabled', false);
        $('#picture').attr('style', 'margin:5px!important;opacity:0');
        $('#uploadPicture').attr('disabled', false);
        $('#uploadPicture').attr('style', 'margin:5px!important;');
        $('#createUpdateCard').attr('disabled', false);
        $('#createUpdateCard').attr('style', 'margin:5px!important;');   
        $('#addPictureSection').attr('style','');
        $('#previewSection').attr('style','display:none');
    }
    else
    {
        $('#calendarPic').attr('disabled', false);
        $('#calendarPic').attr('style', 'margin:5px!important;');
        $('#uploadCalendarPicture').attr('disabled', false);
        $('#uploadCalendarPicture').attr('style', 'margin:5px!important;');
        $('#updateCalendar').attr('disabled', false);
        $('#updateCalendar').attr('style', 'margin:5px!important;'); 

    }
    $('#isPictureUpdated').val(false);
}

function uploadCalendarPicture(e)
{
    var file = $('#calendarPic').prop('files');
    if(file.length == 0)
    {
        $('#calendarPicError').text('No picture has been selected for upload');
    }
    else if(file[0].size > 10240000)
    {
        $('#calendarPicError').text('The picture must not exceed size of 10MB');    
    }
    else
    {
        $('#calendarPicError').text('');
        console.log('ok');
        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';
        data.append('file', $('#calendarPic').prop('files')[0]);
 
        request.addEventListener('load', function(e){
 
         var data = request.response;
         var filePath = data.filePath;

         $('#package2View').attr('style','text-align:center');
         $('#calendarPic').attr('disabled', true);
         $('#calendarPic').attr('style', 'margin:5px!important;background:grey');
         $('#uploadCalendarPicture').attr('disabled', true);
         $('#uploadCalendarPicture').attr('style', 'margin:5px!important;background:grey');
         $('#updateCalendar').attr('disabled', true);
         $('#updateCalendar').attr('style', 'margin:5px!important;background:grey');
         
         var e =document.getElementById('uploadPictureCrop');
        
        basic = new Croppie( e,
        {
            viewport: {
                width: 272,
                height: 200
            },
            enableOrientation:true,
            enableExif:true
            
        });
         

         basic.bind({
            url: filePath
        })
        $('#rotate').on('click',function(e){
            basic.rotate(parseInt(e.currentTarget.getAttribute('data-deg')));
        });
        
        
        });
 
        request.open('post','/uploadCalendarPicture');
        request.send(data);
 
    }
}

function uploadArtwork(e)
{
    console.log($('#artwork').prop('files'));
    var file = $('#artwork').prop('files');
    if(file.length == 0)
    {
        $('#artworkError').text('No artwork has been selected for upload');
        
    }
    else if(file[0].size > 10240000)
    {
        $('#artworkError').text('The artwork must not exceed size of 10MB');    
    }
    else
    {
        $('#overlay25').attr('style','display:block');
        $('#pictureError').text('');
        console.log('ok');
        $('#addPictureSection').attr('style','display:none');
        $('#previewSection').attr('style','');
        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';
        data.append('file', $('#artwork').prop('files')[0]);
 
        request.addEventListener('load', function(e){
 
         var data = request.response;
         var filePath = data.filePath;

         console.log(filePath);
         var accountType = $('#accountType').val();
         console.log(accountType);
        view =  accountType == 1 ? 'adminView' : 'packageView';
         $('#' + view ).attr('style','display:none');
         $('#pictureView').attr('style','height:100%;text-align:center;padding:10px;');
         $('#package2View').attr('style','text-align:center');
         $('#artwork').attr('disabled', true);
         $('#artwork').attr('style', 'margin:5px!important;background:grey');
         $('#uploadArtwork').attr('disabled', true);
         $('#uploadArtwork').attr('style', 'margin:5px!important;background:grey');
         $('#createUpdateCard').attr('disabled', true);
         $('#createUpdateCard').attr('style', 'margin:5px!important;background:grey');
         
         var e =document.getElementById('uploadPictureCrop');
        //  if( currentUploadPicSet == false)
        //  {
             basic = new Croppie( e,
            {
                viewport: {
                    width: 200,
                    height: 200
                },
                enableOrientation:true,
                enableExif:true
                
            });
        //  }
         
         basic.bind({
            url: filePath
        })
        $('#rotate').on('click',function(e){
            basic.rotate(parseInt(e.currentTarget.getAttribute('data-deg')));
        });
        
        $('#overlay25').attr('style','display:none');
        });
 
        request.open('post','/uploadArtwork');
        request.send(data);
 

    } 
}

function uploadPicture(e)
{
    console.log($('#picture').prop('files'));
    var file = $('#picture').prop('files');
    if(file.length == 0)
    {
        $('#pictureError').text('No picture has been selected for upload');
        
    }
    else if(file[0].size > 10240000)
    {
        $('#pictureError').text('The picture must not exceed size of 10MB');    
    }
    else
    {
        $('#overlay25').attr('style','display:block');
        $('#pictureError').text('');
        console.log('ok');
        $('#addPictureSection').attr('style','display:none');
        $('#previewSection').attr('style','');

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';
        data.append('file', $('#picture').prop('files')[0]);
 
        request.addEventListener('load', function(e){
 
         var data = request.response;
         var filePath = data.filePath;

         var accountType = $('#accountType').val();
         console.log(accountType);
        view =  accountType == 1 ? 'adminView' : 'packageView';
         $('#' + view ).attr('style','display:none');
         $('#pictureView').attr('style','height:100%;text-align:center;padding:10px;');
         $('#package2View').attr('style','text-align:center');
         $('#picture').attr('disabled', true);
         $('#picture').attr('style', 'margin:5px!important;background:grey');
         $('#uploadPicture').attr('disabled', true);
         $('#uploadPicture').attr('style', 'margin:5px!important;background:grey');
         $('#createUpdateCard').attr('disabled', true);
         $('#createUpdateCard').attr('style', 'margin:5px!important;background:grey');
         
         var e =document.getElementById('uploadPictureCrop');
        //  if( currentUploadPicSet == false)
        //  {
             basic = new Croppie( e,
            {
                viewport: {
                    width: 200,
                    height: 200
                },
                enableOrientation:true,
                enableExif:true
                
            });
        //  }
         

         basic.bind({
            url: filePath
        })
        $('#rotate').on('click',function(e){
            basic.rotate(parseInt(e.currentTarget.getAttribute('data-deg')));
        });
        
        
        $('#overlay25').attr('style','display:none');
        });
 
        request.open('post','/uploadPicture');
        request.send(data);
 

    }
}

function confirmPicture(e)
{
    $('#overlay25').attr('style','display:block');
    var selectedPackage = e.currentTarget.getAttribute('data-packageId');
        basic.result({type:'blob',
        size:'original',
        quality:0.90,
        format:'jpeg'
    
    }).then(function(blob) {
       // do something with cropped blob
      
      
        blob.name = 'croppedImage.png';
    //   var file = new File([blob],'croppedImage.png');
    //   console.log(file);
      var kidId = e.currentTarget.getAttribute('data-kidId');
      var data2 = new FormData();
      var request2 = new XMLHttpRequest();
      request2.responseType = 'json';
      data2.append('file', blob);
      data2.append('kidId', kidId);

      request2.addEventListener('load', function(e){

       console.log('sent')
        $('#package2View').attr('style','display:none');
        
       if($('#calendar').val() == undefined )
       {  
           
            $('#pictureView').attr('style','display:none');
            $('#isPictureUpdated').val(true);
            console.log(selectedPackage);
            if(selectedPackage == 2)
            {
                $('#picture').attr('disabled', false);
                $('#picture').attr('style', 'margin:5px!important;');
                $('#uploadPicture').attr('disabled', false);
                $('#uploadPicture').attr('style', 'margin:5px!important;');
            }
            else
            {
                $('#artwork').attr('disabled', false);
                $('#artwork').attr('style', 'margin:5px!important;');
                $('#uploadArtwork').attr('disabled', false);
                $('#uploadArtwork').attr('style', 'margin:5px!important;');
            }

            $('#createUpdateCard').attr('disabled', false);
            $('#createUpdateCard').attr('style', 'margin:5px!important;');
            $('#createUpdateCard').click();
       }
       else
       {
            $('#isPictureUpdated').val(true);
            $('#calendarPic').attr('disabled', false);
            $('#calendarPic').attr('style', 'margin:5px!important;');
            $('#uploadCalendarPicture').attr('disabled', false);
            $('#uploadCalendarPicture').attr('style', 'margin:5px!important;');
            $('#updateCalendar').attr('disabled', false);
            $('#updateCalendar').attr('style', 'margin:5px!important;');
       }
    
       $('#overlay25').attr('style','');
      });

      var openUrl;
      if($('#calendar').val() == undefined )
      {
          if(selectedPackage == 2)
          {
            openUrl = '/addPicture';
          }
          else
          {
              openUrl = '/addArtwork';
          }
          
      }
      else
      {
        openUrl ='/addCalendarPicture';
      }
      request2.open('post',openUrl);
      request2.send(data2);

       // download(blob,'reece.png');
   });

}


function tempMethod()
{
    var kidId = $('#kid').val();
    const data = {kidId:kidId};
    $.ajax({
        type:'get',
        url:'/getKid',
        data:data,
        success:function(data)
        {
            var kid = data.kid;
            $('#schoolCheckBox').prop('checked', kid.displaySchool);
            $('#classCheckBox').prop('checked',kid.displayClass);
            $('#ageCheckBox').prop('checked',kid.displayAge);

        }
    })
                             
}

function displayCard()
{
    var cardId = $('#card').val();
    var selectedPackage = $('#selectedPackage').val();
    console.log(cardId );
    var data = {cardId:cardId};
        
        if( card != 'null')
        {
            $.ajax({
                type:'get',
                url:'/getCard',
                data:data,
                success:function(data)
                {
                    var accountType = data.accountType;
                    var card = data.card;
                    
                    var cardPath = card.previewPath;
                    var canvas;
                    //- let mainCardPath = user.accountTypeFk == 1 ? card.path : card.previewPath;
                    // if(accountType == 1)
                    // {
                        if(selectedPackage == 1)
                        {
                            cardPath =card.path;
                        }
                        else if(selectedPackage == 2 )
                        {
                            cardPath = card.package2Path
                        }
                        
                        canvas = 'mainCanvas';
                    // }
                    // else
                    // {
                    //      canvas = 'parentCanvas';
                    //     if(selectedPackage != null)
                    //     {
                    //         if(selectedPackage == 1)
                    //         {
                    //             cardPath = card.previewPath;
                    //         }
                    //         else if(selectedPackage == 2)
                    //         {
                    //             cardPath = card.package2PreviewPath;
                    //         }
                    //     }
                    // }
                    pdfjsLib.getDocument(cardPath)
                    .then(function(doc){
                doc.getPage(1).then(function(page){
                        var myCanvas= document.getElementById(canvas);
                        var context = myCanvas.getContext("2d");
                        
                        // 1 means the original size of the page
                        
                        var viewport= page.getViewport(3);
                        myCanvas.height = viewport.height;
                        myCanvas.width = viewport.width;
                page.render({
                        canvasContext:context,
                        viewport:viewport
                    })
    
                    })
                    });
            }
        })

        }
           
}

function selectPackage2(e)
{   
    const kidId = e.currentTarget.getAttribute('data-kidId');
    const packageId = e.currentTarget.getAttribute('data-packageId');

    window.location='/kid?id='+ kidId + '&selectedPackage='+packageId;
  
}

function selectPackage(e)
{   
    const selectedPackageOption =  $(this).children("option:selected")[0];
    const kidId = selectedPackageOption.getAttribute('data-kidId');
    const packageId = $('#packageOptions').val();

    window.location='/kid?id='+ kidId + '&selectedPackage='+packageId;
  
}

function switchView(e)
{
    var value =  $('#switchView');
    const target = e.currentTarget;
    var path;
    if(value.val() == 'Switch To Photo Pack')
    {
        path = target.getAttribute('data-cardPackage2Path');
        value.val('Switch To Standard Pack');

        
        document.getElementById('current').innerHTML = "Photo Pack: Edit Options";
    
    }
    else
    {
        //     var a = document.getElementById('sItem1').style.backgroundColor = "#33cc33";
        
        // var b = document.getElementById('sItem2').style.backgroundColor = "#f1f1f2";
        
        // var c = document.getElementById('sItem3').style.backgroundColor = "#f1f1f2";
        
        document.getElementById('current').innerHTML = "Standard Pack: Edit Options";
        path = target.getAttribute('data-cardPath');
        value.val('Switch To Photo Pack');
    }

    pdfjsLib.getDocument(path)
                .then(function(doc){
            doc.getPage(1).then(function(page){
                    var myCanvas= document.getElementById("mainCanvas");
                    var context = myCanvas.getContext("2d");
                    
                    // 1 means the original size of the page
                    
                    var viewport= page.getViewport(1.4);
                    myCanvas.height = viewport.height;
                    myCanvas.width = viewport.width;
            page.render({
                    canvasContext:context,
                    viewport:viewport
                })

                })
                });
}

function printCard(e)
{
    var card = $('#card').val();
    if(card != 'null')
    {
        var path = e.currentTarget.getAttribute('data-cardPath');
        window.location = '/printScreen?samplePath='+path;
    }
}

function printProof(e)
{
    var card = $('#card').val();
    if(card != 'null')
    {
        var path = e.currentTarget.getAttribute('data-cardProof');
        window.location = '/printScreen?samplePath='+path;
    }
}
function goToClass(e)
{
    var classId = e.currentTarget.getAttribute('data-classId');
    window.location = '/class?id='+classId;
}

function generateCalendar(e)
{
    const calendarId = e.currentTarget.getAttribute('data-calendarId'); 
    var color = $('#color').val();
    var orientation = $('#orientation').val();

    var data = {calendarId:calendarId, color:color, orientation:orientation};

    $.ajax({
        type:'POST',
        url:'/generateCalendar',
        data:data,
        success:function(data)
        {
            window.location = data.path;
        }
    })
}

function updateCalendar(e)
{
    $('#overlay').attr('style','display:block');
    const calendarId = e.currentTarget.getAttribute('data-calendarId'); 
    const kidId = e.currentTarget.getAttribute('data-kidId');

    var data = new FormData();
    var request = new XMLHttpRequest();
    request.responseType = 'json';
    data.append('file', $('#calendarPic').prop('files')[0]);
    data.append('kidId',kidId );
    data.append('calendarId', calendarId );

    request.addEventListener('load', function(e){

        var job = request.response;
        console.log(job)
        if(job.errors == null || job.errors == undefined )
         {
            calendarPicJobs[job.id] = {id: job.id, state: "queued", calendarId:job.calendarId,kidId:kidId, totalSteps:job.totalSteps, accountType:job.accountType};
         }
         else
         {
             $('#overlay').attr('style','display:none');
         }

     } )
     // add a progress bar of some sort
     request.open('post','/updateCalendar');
     request.send(data);
     
 
}

function generateCard(e)
{
    const kidId = e.currentTarget.getAttribute('data-kidId');
    var selectedPackage = $('#selectedPackage').val();
    var data = {kidId:kidId, selectedPackage:selectedPackage};
    $.ajax({
        type:'POST',
        url:'/generateCard',
        data:data,
        success:function(data)
        {
            window.location = data.path;
        }
    })
}

function createUpdateCard(e)
{
    $('#overlay').attr('style','display:block')
    const kidId = e.currentTarget.getAttribute('data-kidId');
    var card = $('#card').val();
    // var creatingUpdating = $('#creatingUpdating');
    // creatingUpdating.attr('style','');
    if(card == 'null')
    {
        var data = {kidId:kidId};
        $.ajax({
            
            type: 'POST',
            url: "/createCardAdmin",
            data: data,
            success:function(job)
            {
                
                kidJobs[job.id] = {id: job.id, state: "queued", kidId:job.kidId, totalSteps:job.totalSteps, accountType:job.accountType};

            }
        });
        
        
    }
    else
    {
        // update 
        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';
        // if($('#artwork').prop('files') != undefined)
        //     data.append('file2', $('#artwork').prop('files')[0]);
        data.append('kidId',e.currentTarget.getAttribute('data-kidId'));
        data.append('schoolCheckBox', $('#schoolCheckBox').is(':checked'));
        data.append('classCheckBox', $('#classCheckBox').is(':checked'));
        data.append('ageCheckBox', $('#ageCheckBox').is(':checked'));
        data.append('name', $('#updateName').val());
        data.append('age', $('#updateAge').val());
        data.append('month', $('#updateMonth').val());
        data.append('isPictureUpdated',$('#isPictureUpdated').val());
        
        request.addEventListener('load', function(e){

           var job = request.response;
           console.log(job)
           if(job.errors == null || job.errors == undefined )
            {
                picArtworkJobs[job.id] = {id: job.id, state: "queued", kidId:job.kidId, totalSteps:job.totalSteps, accountType:job.accountType};
            }
            else
            {
                $('#overlay').attr('style','display:none');
            }
  
        } )
        // add a progress bar of some sort
        request.open('post','/updateCardAdmin');
        request.send(data);
        
    }
}

function addToBasket(e)
{

    $('#errorBasket').text('');
    var selectedPackage = $('#selectedPackage').val();
    var quantity = $('#quantity').val();
    var color = $('#color').val();
    var orientation = $('#orientation').val();
    var kidId = e.currentTarget.getAttribute("data-kidId");
    var data;
    
    $.ajax({
        type:'get',
        url:'/hasBeenModified',
        data:{kidId:kidId},
        success:function(result)
        {
            if(result.error)
            {
                $('#errorBasket').text('Please update the artwork on the front of the card and the name on the back of the card before adding to basket.');
            }
            else
            {
                if( quantity != 0 )
                {
                    
                    if(selectedPackage != 3)
                    {
                        data = {kidId: kidId,
                        packageId: selectedPackage,
                        quantity: quantity};
                    }
                    else
                    {
                        data = {kidId: kidId,
                        packageId: selectedPackage,
                        quantity: quantity,orientation:orientation,color:color};
                        console.log(orientation);
                        console.log(color);
                    }
    
                    $.ajax({
                        type: "post",
                        url:"/addToBasket",
                        data:data,
                        dataType: "json",
                        success: function(data)
                        {
                            console.log(data);
                            var numberOfBasketItems = data.numberOfBasketItems;
                            var subTotal = data.subTotal;
                            $('#basket').text('Basket (' + numberOfBasketItems + ')');
                            $('#basket2').text('Basket (' + numberOfBasketItems + ')');
                            $('#proceed').css('visibility','visible');
                            $('#packagePrice2').text('£' + subTotal );
                        }
                    })
                }    
            }
        }
    })
     
}


function quantityChange(e)
{
    var quantity = $('#quantity').val();
    var price =(e.currentTarget.getAttribute('data-price'));
    if( quantity <= 0 )
    {
        quantity = 1;
        $('#quantity').val(1);
    }
    price = price * quantity;
    price = price.toFixed(2);
    $('#packagePrice').text('£' + price );
}

function updateJobs() {
    for (var id of Object.keys(kidJobs)) {
        var data ={id:id};
        $.ajax({
            type:'get',
            url:'/createAdminCardJobs',
            data:data,
            success:function(result)
            {
                if( result.process == 'createCardAdmin')
                {
                  var progress = result.progress;
                  var totalSteps = 4;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  var job = kidJobs[result.id];
                  if(progress == totalSteps)
                  {
                    $('#overlay').attr('style','display:none');
                    
                        window.location= '/kid?id='+job.kidId;
                  }
              
                }
            }
        })
    }
      
  }

  function updateCalendarJobs()
  {
    for (var id of Object.keys(calendarPicJobs)) {
        var data = {id:id};

        $.ajax({
            type:'get',
            url:'/updatePicArtworkJobs',
            data:data,
            success:function(result)
            {
                if(result.process='updateCalendar')
                {
                  var progress = result.progress;
                  var totalSteps = 32;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  var job = calendarPicJobs[result.id];
                  if(progress == totalSteps)
                  {
                    $('#overlay').attr('style','display:none');
                   window.location= '/kid?id=' +job.kidId+ '&selectedPackage='+ $('#selectedPackage').val() + '&color='+ $('#color').val() + '&orientation=' + $('#orientation').val();
                  } 
                }
            }
        })

    }
  }

  function updatePicArtworkJobs() {
    for (var id of Object.keys(picArtworkJobs)) {
        var data = {id:id};

        $.ajax({
            type:'get',
            url:'/updatePicArtworkJobs',
            data:data,
            success:function(result)
            {
                if(result.process='artworkPic')
                {
                  var progress = result.progress;
                  var totalSteps = 6;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  var job = picArtworkJobs[result.id];
                  if(progress == totalSteps)
                  {
                    $('#overlay').attr('style','display:none');
                   window.location= '/kid?id=' +job.kidId+ '&selectedPackage='+ $('#selectedPackage').val();
                    
                }
                }
            }
        })
    }
  }

function createProof(e)
{
    var kidId = e.currentTarget.getAttribute("data-kidId");
    var data = {kidId:kidId};
    $.ajax({
        xhr: function()
        {
          var xhr = new XMLHttpRequest();
          //Upload progress
  
          return xhr;
        },
        type: 'POST',
        url: "/createProof",
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
