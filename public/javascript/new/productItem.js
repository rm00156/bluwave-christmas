
var basic;
var img;
var url;
var jobs = [];
var updatesJobs = [];
var originalDisplaySchool;
var originalDisplayClass;
var originalDisplayAge;

$(document).ready(function(){

    displayCard();
    setupSelectRadio();
    $('#container').on('click', openFileBrowser);
    $('#picture1').on('change', setupCropWindow);
    $('#cancelCrop').on('click', cancelCrop);
    $('#confirmCrop').on('click', confirmCrop);

    $('#cancelCaman').on('click', cancelCaman);
    $('#updateProductItem').on('click', updateProductItem);
    $('#quantity').on('change', quantityChange);
    $('#addToBasket').on('click',addToBasket);
    $('#selectKid').on('change', selectKid);
    $('#linkItem').on('click', linkItem);

    setInterval(updateJobs, 1000);
    setInterval(updateUpdatesJobs, 1000);

    originalDisplaySchool = $('#displaySchool').is(':checked');
    originalDisplayAge = $('#displayAge').is(':checked');
    originalDisplayClass = $('#displayClass').is(':checked'); 
})

function openFileBrowser()
{
  $('#picture1').trigger('click');
}

function linkItem(e)
{
  $('#errorSchoolCode').text('');
  $('#errorClassCode').text('');
  $('#errorClassSchool').text('');

  var productItemId = e.currentTarget.getAttribute('data-productItemId');
  var schoolCode = $('#schoolCode').val();
  var classCode = $('#classCode').val();

  if(schoolCode == '' || classCode == '')
  {
    if(schoolCode == '')
      $('#errorSchoolCode').text('Please enter a valid school code');

    if(classCode == '')
      $('#errorClassCode').text('Please enter a valid class code');
  }
  else
  {
    var data = {schoolCode:schoolCode, classCode:classCode, productItemId:productItemId};

    $.ajax({
      type: 'post',
      url:'/link_kid_productItemId',
      data:data,
      success:function(data)
      {
        var errors = data.errors;

        if(errors)
        {
          $('#errorClassSchool').text(errors.code);
        }
        else
        {
          location.reload();
        }
      }
    })
  }
    

}

function quantityChange()
{
  var quantity = $('#quantity').val();

  if(quantity == '')
    $('#quantity').val(1);
}

function updateProductItem(e)
{
  var originalName = $('#updateName').data('value');
  var originalAge = $('#updateAge').data('value');
  var originalMonth = $('#updateMonth').data('value');
  var newName = $('#updateName').val();
  var newAge = $('#updateAge').val();
  var newMonth = $('#updateMonth').val();
  var newDisplaySchool = $('#displaySchool').is(':checked');
  var newDisplayAge = $('#displayAge').is(':checked');
  var newDisplayClass = $('#displayClass').is(':checked');

  $('#error').text('');
  $('#errorAge').text('');

  if(originalName == newName  && originalAge == newAge && originalMonth == newMonth 
      && newDisplaySchool == originalDisplaySchool && newDisplayAge == originalDisplayAge && newDisplayClass == originalDisplayClass)
  {
    // display error message
    $('#error').text('No Changes have been made');
  }
  else
  {
    // continue
    console.log(newAge)
    console.log(newMonth)
    if(newAge == '' || newMonth == '')
      return $('#errorAge').text('Please only enter a number for an age');

    // update and generate
    $('#overlay2').attr('style','display:block;z-index:55');
    var productItemId = e.currentTarget.getAttribute('data-productItemId');
    var productId = e.currentTarget.getAttribute('data-productId');
    var productNumber = e.currentTarget.getAttribute('data-productNumber');
    var productVariantId = e.currentTarget.getAttribute('data-productVariantId');

    var data = new FormData();
    var request = new XMLHttpRequest();
    request.responseType = 'json';
    
    data.append('name', newName);
    data.append('age', newAge);
    data.append('month', newMonth);
    data.append('displaySchool', newDisplaySchool);
    data.append('displayAge', newDisplayAge);
    data.append('displayClass', newDisplayClass);
    data.append('productItemId', productItemId);
    data.append('productId', productId);
    data.append('productNumber', productNumber);
    data.append('productVariantId', productVariantId);

    request.addEventListener('load', function(data){
        var job = data.currentTarget.response;
        
        updatesJobs[job.id] = {id: job.id, state: "queued", totalSteps:job.totalSteps, productNumber: job.productNumber, productVariantId: job.productVariantId, productItemNumber: job.productItemNumber};
    });

    request.open('post','/updateAndGenerate');
    request.send(data);
  }

}

function setupSelectRadio()
{
    var selectCount = $('#selectCount').val();
    console.log(selectCount)
    for(var i = 0; i < selectCount; i++)
    {
        $('#selectLabel' + i ).on('click', select);
    }
}

function select(e)
{
    var url = e.currentTarget.getAttribute('data-url');
    console.log(url)
    window.location = url;
}

function displayCard()
{
    var cardPath = $('#cardPath').val()
        
    pdfjsLib.getDocument(cardPath).then(function(doc)
    {
        doc.getPage(1).then(function(page)
        {
            var myCanvas = document.getElementById('mainCanvas');
            var context = myCanvas.getContext("2d");
        
            // 1 means the original size of the page
            
            var viewport = page.getViewport(3);
            myCanvas.height = viewport.height;
            myCanvas.width = viewport.width;
            page.render({
                    canvasContext:context,
                    viewport:viewport
                })

         })
    });
}

function setupCropWindow(e)
{
    var file = $('#picture1').prop('files');
    // const canvas = document.getElementById("canvas");
    // const ctx = canvas.getContext("2d");
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
        file = file[0];
        $('#overlay').attr('style','display:block;z-index:55');
        $('#gif').attr('style','display:flex;justify-content: center');
        
        url = URL.createObjectURL(file);
        var kidCode = e.currentTarget.getAttribute('data-kidCode');
        var e = document.getElementById('uploadedImageForCrop');
          // 272
          basic = new Croppie(e,{
              viewport: {
                  width: kidCode != null ? 200 : 272,
                  height: 200
              },
              enableOrientation:true,
              enableExif:true });
      
          basic.bind({
              url: url
          })

          $('#rotate').on('click',function(e){
              basic.rotate(parseInt(e.currentTarget.getAttribute('data-deg')));
          });

          $('#gif').attr('style','display:none');

    }
}

function cancelCrop()
{
    basic.destroy();
    $('#uploadedImageForCrop').empty();
    $('#overlay').attr('style','display:none');
}

function cancelCaman()
{
  location.reload();
}

function confirmCrop()
{
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext("2d");

    basic.result({type:'blob',
        size:'original',
        quality:0.90,
        format:'jpeg'}).then(function(blob) {

            $('#uploadedImageForCrop').empty();
            $('#cropSection').attr('style','display:none');
            $('#canvas').attr('style','display:block;width:-webkit-fill-available');
            var uri = URL.createObjectURL(blob);
            var img = new Image();

            img.src = uri;
            // On image load add to canvas
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                canvas.removeAttribute("data-caman-id");
            }

            $('#camanSection').attr('style','display:block');
            
            document.addEventListener("click", e => {
                if (e.target.classList.contains("filter-btn")) {
                  if (e.target.classList.contains("brightness-add")) {
                    Caman("#canvas", img.src, function() {
                      this.brightness(5).render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("brightness-remove")) {
                    Caman("#canvas", img.src, function() {
                      this.brightness(-5).render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("contrast-add")) {
                    Caman("#canvas", img.src, function() {
                      this.contrast(5).render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("contrast-remove")) {
                    Caman("#canvas", img.src, function() {
                      this.contrast(-5).render();
                        $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');
                      
                    });
                  } else if (e.target.classList.contains("saturation-add")) {
                    Caman("#canvas", img.src, function() {
                      this.saturation(5).render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("saturation-remove")) {
                    Caman("#canvas", img.src, function() {
                      this.saturation(-5).render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("vibrance-add")) {
                    Caman("#canvas", img.src, function() {
                      this.vibrance(5).render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("vibrance-remove")) {
                    Caman("#canvas", img.src, function() {
                      this.vibrance(-5).render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("vintage-add")) {
                    Caman("#canvas", img.src, function() {
                      this.vintage().render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  }
                  else if (e.target.classList.contains("lomo-add")) {
                    Caman("#canvas", img.src, function() {
                      this.lomo().render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("clarity-add")) {
                    Caman("#canvas", img.src, function() {
                      this.clarity().render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("sincity-add")) {
                    Caman("#canvas", img.src, function() {
                      this.sinCity().render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("crossprocess-add")) {
                    Caman("#canvas", img.src, function() {
                      this.crossProcess().render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("pinhole-add")) {
                    Caman("#canvas", img.src, function() {
                      this.pinhole().render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("nostalgia-add")) {
                    Caman("#canvas", img.src, function() {
                      this.nostalgia().render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  } else if (e.target.classList.contains("hermajesty-add")) {
                    Caman("#canvas", img.src, function() {
                      this.herMajesty().render();
                      $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');

                    });
                  }
            
                }
            })

            $('#reset').on('click', function(){
                
                Caman("#canvas", img.src, function() {
                    this.reset();
                    console.log('revert')
                    $('#canvas').attr('style','display:block;width:-webkit-fill-available !important;height:-webkit-fill-available !important;');
  
                  });
            });

            $('#confirmPicture').on('click', confirmPicture);

        })
}

function confirmPicture(e)
{
    $('#overlay').attr('style','display:none');
    $('#overlay2').attr('style','display:block;z-index:55');
    var productItemId = e.currentTarget.getAttribute('data-productItemId');
    var pictureNumber = e.currentTarget.getAttribute('data-pictureNumber');
    var productId = e.currentTarget.getAttribute('data-productId');
    var productNumber = e.currentTarget.getAttribute('data-productNumber');
    var productVariantId = e.currentTarget.getAttribute('data-productVariantId');
    var productItemNumber = e.currentTarget.getAttribute('data-productItemNumber');

    // upload image and set to the user
    // then generate productItem

    var canvas = document.getElementById('canvas');

    canvas.toBlob(function(blob){

      new Compressor(blob, {
        quality: 0.6,
    
        // The compression process is asynchronous,
        // which means you have to access the `result` in the `success` hook function.
        success(result) {
          
          console.log(result);
          var data = new FormData();
          var request = new XMLHttpRequest();
          request.responseType = 'json';
          data.append('blob', result);
          data.append('productItemId', productItemId);
          data.append('pictureNumber', pictureNumber);
          data.append('productId', productId);
          data.append('productNumber', productNumber);
          data.append('productVariantId', productVariantId);
          // data.append('productItemNumber', productItemNumber);

          request.addEventListener('load', function(data){
              var job = data.currentTarget.response;
              
              jobs[job.id] = {id: job.id, state: "queued", totalSteps:job.totalSteps, productItemNumber: productItemNumber, productNumber: job.productNumber, productVariantId: job.productVariantId};
          });

          request.open('post','/uploadAndGenerate');
          request.send(data);
          
        },
        error(err) {
          console.log(err.message);
        },
      });
      

      // console.log(blob)
      
    }, 'image/jpeg')
}

function updateJobs() {
  
    if(jobs.length > 0)
    {
      for (var id of Object.keys(jobs)) {
        var data = {id:id};
        $.ajax({
            type:"get",
            url:'/updateAndGenerateJob',
            data:data,
            success:function(result){
                if(result.process== 'uploadAndGenerate')
                {
                    var progress = result.progress;
                    var totalSteps = jobs[result.id].totalSteps;
                    var productNumber = jobs[result.id].productNumber;
                    var productVariantId = jobs[result.id].productVariantId;
                    var productItemNumber = jobs[result.id].productItemNumber;

                    var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                    $('#progress').attr('style','z-index:55;height:25px;width:' + progressAsPercentage + '%');
                    $('#progress').text(progressAsPercentage + '%');
            
                    if(progress == totalSteps)
                    {
                        var jobId = result.id;
                        $('#overlay2').attr('style','display:block;z-index:55');
                        
                        window.location = isAdmin() ? ('/admin_productItem?productItemNumber=' + productItemNumber) : '/productItem?productNumber=' + productNumber  +'&productVariantId=' + productVariantId + (productItemNumber==undefined || productItemNumber == null) ? '' : '&productItemNumber=' + productItemNumber;
                        delete jobs[jobId];
                        
                    }
                }
            }
        })
      }
    }
      
  }

  function updateUpdatesJobs() {
  
    if(updatesJobs.length > 0)
    {
      for (var id of Object.keys(updatesJobs)) {
        var data = {id:id};
        $.ajax({
            type:"get",
            url:'/updateAndGenerateJob',
            data:data,
            success:function(result){
                if(result.process== 'updateAndGenerate')
                {
                    var progress = result.progress;
                    var totalSteps = updatesJobs[result.id].totalSteps;
                    var productNumber = updatesJobs[result.id].productNumber;
                    var productVariantId = updatesJobs[result.id].productVariantId;
                    var productItemNumber = updatesJobs[result.id].productItemNumber;

                    var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                    $('#progress').attr('style','z-index:55;height:25px;width:' + progressAsPercentage + '%');
                    $('#progress').text(progressAsPercentage + '%');
            
                    if(progress == totalSteps)
                    {
                        var jobId = result.id;
                        $('#overlay2').attr('style','display:block;z-index:55');
                        window.location = isAdmin() ? ('/admin_productItem?productItemNumber=' + productItemNumber) : '/productItem?productNumber=' + productNumber  +'&productVariantId=' + productVariantId + '&productItemNumber=' + productItemNumber;
                        delete updatesJobs[jobId];
                        
                    }
                }
            }
        })
      }
    }
      
  }

  function addToBasket(e)
  {
      var disabled =  e.currentTarget.getAttribute("data-disabled");
      var quantity = $('#quantity').val();
      var productItemId = e.currentTarget.getAttribute('data-productItemId');
      var data;
  
      if( quantity != 0  || disabled == false)
      {
          data = {quantity:quantity,productItemId:productItemId};
          
          $.ajax({
              type: "post",
              url:"/addToBasket3",
              data:data,
              dataType: "json",
              success: function(data)
              {
                  console.log(data);
                  if(data.error)
                  {
                      $('#addToBasketError').text(data.error);
                  }
                  else
                  {
                      var numberOfBasketItems = data.numberOfBasketItems;
                      // var subTotal = data.subTotal;
                      $('#basket').text('Basket (' + numberOfBasketItems + ')');
                      $('#basket2').text('Basket (' + numberOfBasketItems + ')');
                      $('#proceed').css('visibility','visible');
                      window.location = '/mightLike'
                  }
              }
          })
      }     
  }

function selectKid()
{
  var e = $('#selectKid').find(":selected");
  console.log()
  var productNumber = e.attr('data-productNumber')
  var productItemNumber = e.attr('data-productItemNumber');
  var productVariantId = e.attr('data-productVariantId'); 
  window.location = '/productItem?productNumber=' + productNumber + '&productItemNumber=' + productItemNumber + '&productVariantId=' + productVariantId;
}

function isAdmin()
{
  var accountType = $('#accountType').val();
  if(accountType == 1)
    return true;
  
  return false;
}