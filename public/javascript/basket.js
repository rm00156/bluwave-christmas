var productItemId;
$(document).ready(function(){

    // $('basketItemsTable').DataTable();
    var basketItems =  $('#basketItems').val();
   
    getBasketItems(basketItems);

    $('#cancel').on('click', cancelLink);
    $('#link').on('click', link);
});

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

        $('#quantity'+i).on('change', updateBasketQuantity);
        $('#remove'+i).on('click', remove);

        setupLinkSchools(i);
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
        
        var viewport= page.getViewport(3);
        myCanvas.height = viewport.height;
        myCanvas.width = viewport.width;
page.render({
        canvasContext:context,
        viewport:viewport
    })
    })
})
}

function updateBasketQuantity(e)
{
    const currentTarget = e.currentTarget;
    const index = currentTarget.getAttribute('data-index');
    const newQuantity = $('#quantity' + index).val();
    const basketItemId = currentTarget.getAttribute('data-basketItemId');
    const previousQuantity = currentTarget.getAttribute('data-previous');
    const loggedInUserType = currentTarget.getAttribute('data-loggedInUserType');
    const number = currentTarget.getAttribute('data-number');

    console.log(index);
    console.log(newQuantity);
    console.log(basketItemId);
    console.log(previousQuantity);
    console.log(loggedInUserType);
    console.log(number);
    if(newQuantity != '' && newQuantity != 0 && newQuantity != previousQuantity)
    {
        var data = {newQuantity:newQuantity, basketItemId:basketItemId};

        $.ajax({
            type:'post',
            url:'/updateBasketItemQuantity',
            data:data,
            success:function(data)
            {
                if(loggedInUserType == 1)
                {
                    window.location = '/new_account_details?number=' + number;
                }
                else
                {
                    window.location = '/basket';
                }
            }
        })
    }

 }

function remove(e)
{
    var basketItemId = e.currentTarget.getAttribute('data-basketItemId');
    const loggedInUserType = e.currentTarget.getAttribute('data-loggedInUserType');
    const number = e.currentTarget.getAttribute('data-number');

    $.ajax({
        type: "post",
        url:"/removeBasketItem",
        data:{basketItemId:basketItemId},
        dataType: "json",
        success: function(data)
        {
            if(loggedInUserType == 1)
            {
                window.location = '/new_account_details?number=' + number;
            }
            else
            {
                window.location = '/basket';
            }
        }
    })
    
}

function setupLinkSchools(index)
{
    var productItemId = $('#item' + index).val();
    
    if(productItemId == '' || productItemId == null || productItemId == undefined)
    {
        // do nothing
    }
    else
    {
        $.ajax({
            type: 'get',
            url:'/display_link_school_button',
            data:{productItemId:productItemId},
            success:function(data)
            {
                console.log(data)
                var displayLinkSchoolButton = data.displayLinkSchoolButton;
    
                console.log(displayLinkSchoolButton);
                if(displayLinkSchoolButton)
                {
                    $('#itemButton' + index).attr('style', 'block');
                    $('#itemButton' + index).on('click', displayLinkKidToSchool);
                }
                                  
                
            }
        })
    }
    
    // from productItemId determine whether link button should be displayed

}

function displayLinkKidToSchool(e)
{
    productItemId = e.currentTarget.getAttribute('data-productItemId');

    $('#overlay').attr('style', 'display:block');
}

function cancelLink()
{
    productItemId = null;
    $('#overlay').attr('style', 'display:none');
}

function link()
{
    var schoolCode = $('#schoolCode').val();
    var classCode = $('#classCode').val();

    $.ajax({
        type:'post',
        url:'/link_kid_productItemId',
        data:{productItemId:productItemId, schoolCode:schoolCode, classCode:classCode},
        success:function(data)
        {
            var errors = data.errors;
            if(errors)
            {
                $('#error').text(errors.code);
            }
            else
            {
                window.location = '/basket';
            }
        }
    })
}