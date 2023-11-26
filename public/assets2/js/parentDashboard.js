$(document).ready(function(){

    var numberOfKids = $('#numberOfKids').val();

    for( var i = 0; i < numberOfKids; i++ )
    {
        $('#kid' + i).on('click', navigateToProductForKid);
    }
})


function navigateToProductForKid(e)
{
    var productItemNumber = e.currentTarget.getAttribute('data-productItemNumber');
    var productVariantId = e.currentTarget.getAttribute('data-productVariantId');
    var productNumber = e.currentTarget.getAttribute('data-productNumber');
    window.location = '/productItem?productNumber=' + productNumber + ' &productItemNumber=' + productItemNumber + '&productVariantId=' + productVariantId;
}