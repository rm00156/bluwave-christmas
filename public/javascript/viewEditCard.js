
$(document).ready(function(){
    $('#cardButton').on('click', card);
    $('#linkKid').on('click', linkKid);
    
});

function linkKid()
{
    // need to update the user firstLoginFl to false
    window.location = '/linkKids'
}

function viewEditCard(e) 
{
    var cardId = e.currentTarget.getAttribute("data-cardId");

    $.get('/viewEditCard',{cardId:cardId}, function(data){
        
    });

    
}

function print(e)
{
    var path = e.currentTarget.get("data-path");
    var data = {path:path};

    $.ajax({
        type: "get",
        url:"/printScreen",
        data:data,
        dataType: "json",
        success: function(data)
        {
            console.log(data);
        }
    })
}


function card(e)
{
    var cardId = e.currentTarget.getAttribute("data-cardId");
    console.log(cardId);
    var data = {cardId:cardId};
    $.ajax({
        type: "get",
        url:"/printCard",
        data:data,
        dataType: "json",
        success: function(data)
        {
            console.log(data);
            var errors = data.errors;
           if(errors)
           {
                $('#error').text(errors.card);
           }
           else
           {
            var path = data.path;
            window.location = '/printScreen?samplePath=' +path;
           }
        }
    })
}