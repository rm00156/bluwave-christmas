$(document).ready(function(){


    var productNumber = $('#productNumber').val();

    for(var i = 0; i < productNumber; i++)
    {
        $('#' +i ).on('click', selectProduct);
    }
});

function selectProduct(e)
{
    var productId = e.currentTarget.getAttribute('data-productId');

    window.location = '/productItem?productId=' + productId;
}