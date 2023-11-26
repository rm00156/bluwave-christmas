$(document).ready(function(){

    setupTable();
    setupProductItems();
})

function setupTable()
{
    // $('#kidsTable').DataTable({searching: false, paging: true, info: false});

    var count = $('#kidSize').val();
    console.log(count)
    for(var i = 0; i < count; i++)
    {
        $('#kid' + i).on('click', navigate);
    }  
}

function setupProductItems()
{
    var count = $('#productItemCount').val();
    console.log(count)
    for(var i = 0; i < count; i++)
    {
        $('#item' + i).on('click', navigateProductItems);
    }
}

function navigateProductItems(e)
{
    var href = e.currentTarget.getAttribute('data-href');
    window.location = href;
}

function navigate(e)
{
    var code = e.currentTarget.getAttribute('data-code');
    window.location = '/kidProductItems?kidNumber=' + code;
}
