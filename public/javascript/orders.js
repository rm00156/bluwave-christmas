var purchaseJobs = {};

$(document).ready(function(){

    // $('basketItemsTable').DataTable();
    $('#generateItems').on('click',generateItems); 
    $('#orderAccount').on('click', orderAccount);
    $('#shipped').on('click',shipped);
    $('#setToShipped').on('click',setToShipped);
    var basketItems =  $('#basketItems').val();
   
   getBasketItems(basketItems);
   setInterval(updatePurchaseJobs,1000);
});

function setToShipped()
{
    var purchaseBasketId = $('#purchaseBasketId').val();

    $.ajax({
        type:'post',
        url:'/setToShipped',
        data:{purchaseBasketId:purchaseBasketId},
        success:function(data)
        {
            var error = data.error;
            if(error)
            {
                console.log(error);
            }
            else
            {
                window.location = '/order?id=' + purchaseBasketId;
            }
        }
    })
}

function orderAccount(e)
{
    var orderAccountId = e.currentTarget.getAttribute('data-orderAccountId');
    window.location = '/account?id='+ orderAccountId;
}

function shipped(e)
{
    var shippingId = e.currentTarget.getAttribute('data-shipping');
    var purchaseBasketId = $('#purchaseBasketId').val();
    $.ajax({
        type:'post',
        url:'/setShipped',
        data:{id:shippingId},
        success:function(data)
        {
            window.location= '/order?id='+purchaseBasketId;
        }
    })
}

function generateItems(e)
{
    var purchaseBasketId = $('#purchaseBasketId').val();
    var data = {id:purchaseBasketId};

    console.log(data);
    $.ajax({
        type:'post',
        url:'/generateOrderItems',
        data:data,
        success:function(job)
        {
            $('#overlay').attr('style','display:block')
            $('#progressText').text('Generating Purchased Items ....');
           
                purchaseJobs[job.id] = {id: job.id, state: "queued"}; 
        }
    })

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

function getBasketItems(basketItems)
{
    var array = new Array();
    var map = new Map();
    for(var i = 0; i < basketItems; i++)
    {
        var canvas = $('#basket'+i);
        var id = canvas.attr('data-basketItem')
        array.push(id);
        map.set(id,i);
    }
     array = JSON.stringify(array);
     var data = {data:array};
    $.ajax({
            type:'get',
            url:'/getBasketItems',
            data:data,
            success:function(data)
            {
                var basketItems = data.basketItems;
                // console.log(map);
                for(var i = 0; i< basketItems.length; i++)
                {
                    new Promise(function(resolve,reject){
                        populateBasketItems(i,basketItems,map);
                    })
                }
                
            }
        });
  
}

function populateBasketItems(i,basketItems,map)
{
    var basketItem = basketItems[i];
    var basketItemId = basketItem.id;
    var cardPath = basketItem.path;
    var index = map.get(basketItemId.toString());
    const canvasId = "basket"+index;

    pdfjsLib.getDocument(cardPath)
    .then(function(doc){
doc.getPage(1).then(function(page){
        var myCanvas= document.getElementById(canvasId);
        var context = myCanvas.getContext("2d");
        
        // 1 means the original size of the page
        
        var viewport= page.getViewport(0.5);
        myCanvas.height = viewport.height;
        myCanvas.width = viewport.width;
page.render({
        canvasContext:context,
        viewport:viewport
    })
    })
})
}
