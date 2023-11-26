$(document).ready(function(){

    var kidTotal = $('#kidTotal').val();

    for(var i = 0; i < kidTotal; i++)
    {
        $('#'+i).on('click',kid);
    }
});

function kid(e)
{
    var id = e.currentTarget.getAttribute('data-id');
    window.location = 'kid?id='+id;
}