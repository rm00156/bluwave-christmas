$(document).ready(function(){

    $('#backtotop').on('click', hideButton);
    $('#appearButton').on('click', appearButton);
    $('#twitter').on('click', twitter);

    var url = window.location.origin;
    $('#reasonNav').attr('href', url + '/#reasons');
    $('#aboutNav').attr('href', url + '/#about');
    $('#pricingNav').attr('href', url + '/#pricing');
    $('#productsNav').attr('href', url + '/#products');
    $('#designNav').attr('href', url + '/#design');
    $('#individualNav').attr('href', url + '/#individuals');

    console.log(location)
    if(location.host != "localhost:4000")
    {
        if (location.protocol !== 'https:') {
            location.replace(`https:${location.href.substring(location.protocol.length)}`);
        }
    }
    
})

function appearButton(a){
    $('#backtotop').css('visibility', 'visible');
}

function hideButton(e){
   
    $('#backtotop').css('visibility', 'hidden');
}

function twitter(e)
{
    window.location.href="https://twitter.com/share?url="+ "http://kidscards4christmas.com"+"&text="+document.title;

}