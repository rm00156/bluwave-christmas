var orderJobs = {};
var editBasketItemId;
var editProductItemNumber;

$(document).ready(function(){

    $('#setShipped').on('click', setShipped);
    $('#generateOrderDetails').on('click', generateOrderDetails);
    setInterval(updateOrderInstructionJobs,1000);

    var numberOfItems = $('#numberOfItems').val();

    for(var i = 0; i < numberOfItems; i++) {
        $('.' + i).on('click', navigateToProductItem);
        $('#edit_item' + i).on('click', editModal);
    }

    $('#cancel_edit').on('click', cancelEdit);
    $('#proceed_edit').on('click', proceedEdit);
})

function proceedEdit(e) {
    // update basketitem path  filename and  picture
    // with the current details at of selected productitem

    $.ajax({
        type:'post',
        url:'/update_order_basket_item',
        data: {basketItemId: editBasketItemId, productItemNumber: editProductItemNumber},
        success: function(response) {
            location.reload();
        }
    })
}

function editModal(e) {
   
    editProductItemNumber = e.currentTarget.getAttribute('data-productItemNumber');
    editBasketItemId = e.currentTarget.getAttribute('data-basketItemId');
    console.log(editBasketItemId)
    $('#overlay').attr('style', 'display:block');
}

function cancelEdit() {
    editBasketItemId = null;
    editProductItemNumber = null;
    $('#overlay').attr('style', 'display:none');
}

function navigateToProductItem(e)
{
    var productItemNumber = e.currentTarget.getAttribute('data-productItemNumber');

    window.location = '/admin_productItem?productItemNumber=' + productItemNumber;
}

function setShipped(e)
{
    var purchaseBasketId = e.currentTarget.getAttribute('data-purchaseBasketId');
    console.log(purchaseBasketId)
    $.ajax({
        type:'post',
        url:'/setShipped',
        data:{purchaseBasketId:purchaseBasketId},
        success:function()
        {
            window.location = '/new_order_details?orderNumber=' + 'blu-' + purchaseBasketId;
        }
    })
}

function generateOrderDetails(e)
{
    var id = e.currentTarget.getAttribute('data-id');

    $.ajax({
        url:'/generateOrderDetails',
        type:'post',
        data:{purchaseBasketId:id},
        success:function(job)
        {
            if(!job.error)
            {
                $('#overlay2').attr('style','display:block;z-index:55'); 
                $('#progressText').text('Generating Orders ' + ' ....');
                orderJobs[job.id] = {id: job.id, state: "queued"};
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
    for (var id of Object.keys(orderJobs)) {
        var data = {id:id};
        $.ajax({
            type:'get',
            url:'/createOrderInstructionJob',
            data:data,
            success:function(result){
                if(result.process == 'generateOrderDetails')
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
                    delete orderJobs[jobId];
                    window.location = result.instructionPath;
                           
                  }
                }
            }
        })   
    }
  }