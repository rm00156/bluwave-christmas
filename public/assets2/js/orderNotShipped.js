$(document).ready(function(){

    var numberOfOrders = $('#numberOfOrders').val();

    for(var i = 0; i < numberOfOrders; i++)
    {
        $('#' + i).on('click', navigate);
    }
    $('#orderTable').DataTable({searching: false, paging: true, info: false});
});

function navigate(e)
{
    var id = e.currentTarget.getAttribute('data-id');

    window.location = '/new_order_details?orderNumber=blu-' + id;
}