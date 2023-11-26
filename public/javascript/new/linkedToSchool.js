$(document).ready(function(){

    var numberOfItems = $('#numberOfItems').val();

    for(var i = 0; i < numberOfItems; i++)
    {
        $('#' + i).on('click', navigate);
    }
    $('#kidstoSchoolTable').DataTable({searching: false, paging: true, info: false});
})

function navigate(e)
{
    var schoolNumber = e.currentTarget.getAttribute('data-schoolNumber');
    window.location = '/new_school_details?number=' + schoolNumber;
}