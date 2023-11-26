$(document).ready(function(){

    var numberOfProducts = $('#numberOfProducts').val();

    for(var i = 0; i < numberOfProducts; i++)
    {
        $('#product' + i).on('click', navigate);
    }

    window.addEventListener('pageshow', (event) => {
        event.preventDefault()
        if (event.persisted) {
            location.reload();
          console.log('This page was restored from the bfcache.');
        } else {
          console.log('This page was loaded normally.');
        }
      });
      

})

function navigate(e)
{
    $('#overlay').attr('style', 'display:block');
    var href = e.currentTarget.getAttribute('data-href');
    window.location = href;
}
