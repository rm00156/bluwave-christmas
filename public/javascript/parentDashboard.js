$(document).ready(function(){

    // $('#createYourOwnCard').on('click', createYourOwnCard);
    isFirstLogin();
    const kidTotal = $('#kidTotal').val();
    setUp(kidTotal);

    $('#myChildsCard').on('click', myChildsCard);
    $('#continue').on('click', continueOn);

    for(var i = 0 ; i < 4; i++)
    {
        $('#' + i).on('click', selectProduct);
    }

    var kidIds = JSON.parse( $('#kidTest').val() );
    var data = {kidIds:kidIds};
    if(kidIds.length > 0 )
    {
        $.ajax({
        type:'get',
        url:'/getKidCardPath',
        data:data,
        success:function(data)
        {
            var kidsCards =data.kidsCards;
             for( var i = 0; i< kidsCards.length; i++ )
            {
                new Promise(function(resolve,reject){
                        populateBasketGrid(kidsCards[i],i);
                        })
                }
            }
        })
    }
 
})

function selectProduct(e)
{
    var productId = e.currentTarget.getAttribute("data-id");
    window.location = '/productItem?productId=' + productId;
}

function isFirstLogin()
{
    var firstLoginFl = $('#userFirstLogin').text();
    console.log(firstLoginFl);
    if(firstLoginFl === true || firstLoginFl === "true")
        $('#overlay').attr('style',"display:block");

}

function myChildsCard()
{
    answerFirstLogin(true);
}

function answerFirstLogin(isMyChildsCard)
{
    $.ajax({
        type:'post',
        url:'/updateFirstLogin',
        success:function(data)
        {
            $('#overlay').attr('style','display:none');
            if(isMyChildsCard)
                window.location = '/linkKids';
        }
    })
}

function continueOn()
{
    // need to update the user firstLoginFl to false
   answerFirstLogin(false);
}

function populateBasketGrid(kidsCard,i)
{
    var cardPath = kidsCard.path;
    pdfjsLib.getDocument({
        url:cardPath,
        httpHeaders:{'Access-Control-Allow-Origin':'*'}})
    .then(function(doc){
            doc.getPage(1).then(function(page){
    
    var myCanvas= document.getElementById('canvas'+i);
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
      

const setUp = function(total)
{
    for(var i = 0 ; i < total; i++ )
    {
        $('#row' + i).on('click', viewKid);
    }
}

const viewKid = function(e)
{
    var kidId = e.currentTarget.getAttribute('data-kidId');
    window.location = '/kid?id=' + kidId;
}