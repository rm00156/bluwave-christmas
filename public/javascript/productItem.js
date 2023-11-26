
var productItemJobs = {};

$(document).ready(function(){

    $('#quantity').on('change',quantityChange);
    $('#addToBasket').on('click',addToBasket);
    $('#confirm').on('click', confirmPicture);
    $('#uploadPicture').on('click', uploadPicture);
    displayProductItem();

    setInterval(updateJobs, 1000);

})


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
         
         var productItemHeight = $('#productItemHeight').val();
         
         var productItemWidth = $('#productItemWidth').val();

         console.log(productItemHeight);
         console.log(productItemWidth);
         var e =document.getElementById('uploadPictureCrop');
        //  if( currentUploadPicSet == false)
        //  {
             basic = new Croppie( e,
            {
                viewport: {
                    width: productItemWidth,
                    height: productItemHeight
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
    var productItemId = $('#productItemId').val();
        basic.result({type:'blob',
        size:'original',
        quality:0.90,
        format:'jpeg'
    
    }).then(function(blob) {
       // do something with cropped blob

        blob.name = 'croppedImage.png';
        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';
        data.append('file', blob);
        data.append('productItemId',productItemId);

        request.addEventListener('load', function(e){

           
            $('#pictureView').attr('style','display:none');
            $('#isPictureUpdated').val(true);
           
            $('#picture').attr('disabled', false);
            $('#picture').attr('style', 'margin:5px!important;');
            $('#uploadPicture').attr('disabled', false);
            $('#uploadPicture').attr('style', 'margin:5px!important;');
           
            createProductItem();
            $('#overlay25').attr('style','');
      });

      
      request.open('post','/addPicture');
      request.send(data);

       // download(blob,'reece.png');
   });

}

function createProductItem()
{
    $('#overlay').attr('style','display:block')
    
    // var creatingUpdating = $('#creatingUpdating');
    // creatingUpdating.attr('style','');
    // if(card == 'null')
    // {
    //     var data = {kidId:kidId};
    //     $.ajax({
            
    //         type: 'POST',
    //         url: "/createCardAdmin",
    //         data: data,
    //         success:function(job)
    //         {
                
    //             kidJobs[job.id] = {id: job.id, state: "queued", kidId:job.kidId, totalSteps:job.totalSteps, accountType:job.accountType};

    //         }
    //     });
        
        
    // }
    // else
    // {
        // update 
        var productItemId = $('#productItemId').val();
        var data ={productItemId:productItemId};
        

        $.ajax({
            type:'post',
            url:'/updateProductItem',
            data:data,
            success:function(data)
            {
                var job = data;
                console.log(job);
                if(job.errors == null || job.errors == undefined )
                 {
                     productItemJobs[job.id] = {id: job.id, state: "queued", productItemId:job.productItemId, totalSteps:job.totalSteps};
                 }
                 else
                 {
                     $('#overlay').attr('style','display:none');
                 }
            }
        })
        
        // request.addEventListener('load', function(e){

        //    var job = request.response;
        //    console.log(job);
        //    if(job.errors == null || job.errors == undefined )
        //     {
        //         productItemJobs[job.id] = {id: job.id, state: "queued", productItemId:job.productItemId, totalSteps:job.totalSteps, accountType:job.accountType};
        //     }
        //     else
        //     {
        //         $('#overlay').attr('style','display:none');
        //     }
  
        // } )
        // // add a progress bar of some sort
        // request.open('post','/updateProductItem');
        // request.send(data);
        
    // }
}


function updateJobs() {
    for (var id of Object.keys(productItemJobs)) {
        var data ={id:id};
        $.ajax({
            type:'get',
            url:'/createProductItemJobs',
            data:data,
            success:function(result)
            {
                if( result.process == 'updateProductItem')
                {
                  var progress = result.progress;
                  var totalSteps = 8;
            
                  var progressAsPercentage = ((progress/totalSteps) * 100).toFixed(2);
            
                  $('#progress').attr('style','height:25px;width:' + progressAsPercentage + '%');
                  $('#progress').text(progressAsPercentage + '%');
            
                  var job = productItemJobs[result.id];
                  console.log(job);
                  if(progress == totalSteps)
                  {
                    $('#overlay').attr('style','display:none');
                    
                        window.location= '/productItem?productId='+$('#productId').val();
                  }
              
                }
            }
        })
    }
      
  }


function addToBasket(e)
{
    var disabled =  e.currentTarget.getAttribute("data-disabled");
    var packageId = $('#packageId').val();
    var quantity = $('#quantity').val();
    var productItemId = $('#productItemId').val();
    var kidId = $('#kidId').val();
    var data;

    if( quantity != 0  || disabled == false)
    {
        data = {packageId:packageId,quantity:quantity,productItemId:productItemId,kidId:kidId};
        
        $.ajax({
            type: "post",
            url:"/addToBasket2",
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
                    var subTotal = data.subTotal;
                    $('#basket').text('Basket (' + numberOfBasketItems + ')');
                    $('#basket2').text('Basket (' + numberOfBasketItems + ')');
                    $('#proceed').css('visibility','visible');
                    $('#packagePrice2').text('£' + subTotal );
                }
            }
        })
    }     
}


function displayProductItem()
{
    var productItemId = $('#productItemId').val();
    var data = {productItemId:productItemId};
    $.ajax({
        type:'get',
        url:'/getProductItem',
        data:data,
        success:function(data)
        {
            var productItem = data.productItem;
            console.log(data);
            var path = productItem.pdfPath;

            pdfjsLib.getDocument(path)
                    .then(function(doc){
                doc.getPage(1).then(function(page){
                        var myCanvas= document.getElementById('parentCanvas');
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