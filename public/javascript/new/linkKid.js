var jobs = [];
$(document).ready(function(){

    $('#reece').on('submit', submitForm);
    $('#notPartOfSchool').on('click', createNewCard);
    setInterval(updateJobs, 1000);
})

function createNewCard()
{
    var basket = $('#baskets').val();
    basket = (basket == undefined || basket == null || basket == '') ? false : true;
    var data = {basket:basket};
    $.ajax({
        type:'post',
        url:"/createNewCard",
        data:data,
        dataType: "json",
        success:function(job)
        {
            $('#overlay').attr('style','display:block;z-index:55');
                       
            jobs[job.id] = {id: job.id, state: "queued", basket:job.basket};
        }
    });
}

function submitForm(e)
{
    e.preventDefault()
    var name = $('#name').val();
    var years = $('#years').val();
    var months = $('#months').val();
    var classCode = $('#classCode').val();
    var schoolCode = $('#schoolCode').val();
    var basket = $('#baskets').val();
    basket = (basket == undefined || basket == null || basket == '') ? false : true;
    var data = {name:name,years:years,months:months,classCode:classCode, schoolCode:schoolCode, basket:basket};

    $.ajax({
        type:'post',
        url:"/linkKids",
        data:data,
        dataType: "json",
        success:function(job)
        {
            var errors = job.errors;
            console.log(job)
            if(errors)
            {
                $('#error').text(errors.code);
            }
            else
            {
       
                $('#overlay').attr('style','display:block;z-index:55');
                       
                jobs[job.id] = {id: job.id, state: "queued", basket:job.basket};
            }
            // else if(basket == true)
            // {
            //     window.location = "/basket";
            // }
            // else
            // {
               
            //     if(data.accountType != 1)
            //     {    
            //         window.location = '/productItem?productNumber=' + data.product.productNumber + '&kidCode=' + data.kidCode;
            //     }
            //     else
            //     {
            //         window.location = '/account?id=' + accountLinkedByAdmin;
            //     }
            // }
        }
    })
}


function updateJobs() {
  
    if(jobs.length > 0)
    {
      for (var id of Object.keys(jobs)) {
        console.log(id);
        var data = {id:id};
        $.ajax({
            type:"get",
            url:'/linkKidJob',
            data:data,
            success:function(result){
                if(result.process== 'linkKid')
                {
                    var progress = result.progress;
                    var totalSteps = 1;
                    var basket = result.basket;
                    console.log(result);
                    if(progress == totalSteps)
                    {
                        var jobId = result.id;
                        var linkKidResult = result.result;
                        var productItem = linkKidResult.productItem;
                        var product = linkKidResult.product;

                        console.log(productItem)
                        // $('#overlay2').attr('style','display:block;z-index:55');
                        
                        if(basket == true)
                        {
                            window.location = "/basket";
                        }
                        else
                        {
                            window.location = '/productItem?productNumber=' + product.productNumber  +'&productVariantId=' + productItem.productVariantFk + '&productItemNumber=' + productItem.productItemNumber;
                        }
                        delete jobs[jobId];
                            
                                               
                    }
                }
            }})
        }
    }
}