$(document).ready(function(){

    var numberOfItems = $('#numberOfItems').val();

    for(var i = 0; i < numberOfItems; i++)
    {
        $('#' + i).on('click', navigate);
    }
    $('#giveBackTable').DataTable({searching: false, paging: true, info: false});
})

function navigate(e)
{
    var schoolNumber = e.currentTarget.getAttribute('data-schoolNumber');
    window.location = '/give_back_details?schoolNumber=' + schoolNumber;
}