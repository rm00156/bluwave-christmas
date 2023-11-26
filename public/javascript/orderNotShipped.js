$(document).ready(function(){

    var numberOfItems = $('#numberOfItems').val();

    for(var i = 0; i < numberOfItems; i ++)
    {
        $('#'+i).on('click',order);

    }
})

function order(e)
{
    id = e.currentTarget.getAttribute('data-id');
    window.location = '/order?id=' + id;
}