$(document).ready(function(){

    var numberOfItems = $('#numberOfItems').val();

    for(var i = 0; i < numberOfItems; i++)
    {
        $('#' + i).on('click', navigate);
    }
    $('#accountsTable').DataTable({searching: false, paging: true, info: false});
})

function navigate(e)
{
    var accountNumber = e.currentTarget.getAttribute('data-accountNumber');
    console.log(accountNumber)
    window.location = '/new_account_details?number=' + accountNumber;
}
