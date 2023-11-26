$(document).ready(function(){

    setupTable();
})

function setupTable()
{
    $('#productitems-datatable').DataTable({searching: false, paging: true, info: false});

    var count = $('#kidProductItemCount').val();
    console.log(count)
    for(var i = 0; i < count; i++)
    {
        $('#item' + i).on('click', navigate);
    }
}

function navigate(e)
{
    var url = e.currentTarget.getAttribute('data-href');
    window.location = url;
}