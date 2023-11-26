var originalDelivery;
var subtotal;
var originalDeliveryCost;
var originalDeliveryName;
var deliveryOption;
$(document).ready(function(){
    // $('#purchase').on('click', purchase);
    $('#shipping').on('click',shippingAddress);
    $('#cancel').on('click',cancel);
    $('#link').on('click', link);
    $('#continue').on('click', continueToPurchase);
    $('#ignore').submit(function(e) {
        e.preventDefault();
        
        purchase(true);
    })

    $('#country').on('change',selectCountry);
    originalDelivery = $('#deliveryId').val();
    subtotal = $('#subTotal').val();
    originalDeliveryCost = $('#originalDeliveryCost').val();
    originalDeliveryName = $('#originalDeliveryName').val()

    deliveryOption = JSON.parse( $('#deliveryOption').val() );
})

// var stripe = Stripe('pk_test_5cQWxxaMq14oogwEPGeNiiCG00naQUtjyS');
var stripe = Stripe('pk_live_aQTkfvwiROZzVl4MdtcFbrqh00Xcze97Y4');

function selectCountry(e)
{
    var country = $('#country').val();
    var deliveryName;
    var deliveryPrice;

    if(country == 235)
    {
        deliveryName = deliveryOption.option2;
        deliveryPrice = (parseFloat(deliveryOption.option2Price)).toFixed(2);
    }
    else
    {
        deliveryName = deliveryOption.option3;
        deliveryPrice = (parseFloat(deliveryOption.option3Price)).toFixed(2);
    }

    $('#delivery').text(deliveryName + ' £' + deliveryPrice);
    console.log(subtotal)
    var total = (parseFloat(subtotal) + parseFloat(deliveryPrice)).toFixed(2);
    $('#totalDisplay').text('Total £' + total);
    $('#shipping').attr("data-total",total);
    $('#deliveryName').val(deliveryName);
    $('#deliveryPrice').val(deliveryPrice);
    // if(country == 235)
    // {
    //     $('#deliveryName').html(originalDeliveryName + ' Delivery<span>£' +originalDeliveryCost +'</span>');
    //     var total = parseFloat(subtotal) + parseFloat(originalDeliveryCost);
    //     $('#total').html("Total<span>£"+ total.toFixed(2) +"</span>");
    //     $('#shipping').attr("total",total.toFixed(2));
    //     $('#deliveryId').val(originalDelivery);
    // }
    // else
    // {
    //     console.log('hello')
    //     var deliveryCost = (parseFloat(deliveryOption.option3Price)).toFixed(2)
    //     v
    //     $('#delivery').html(deliveryCost+ ' Delivery<span>£' + deliveryCost +'</span>');
    //     var total = parseFloat(subtotal) + deliveryCost;
    //     $('#total').html("Total<span>£"+ total.toFixed(2) +"</span>");
    //     $('#shipping').attr("data-total",total.toFixed(2));
    //     // $('#deliveryId').val(delivery.id);
        
    // }
}

function link()
{
    window.location = '/linkKids?basket=true';
}

function cancel()
{
    $('#shippingView').attr('style','display:none');
    $('#basketView').attr('style','');
    $('#shipping').attr('disabled',false);
}

function continueToPurchase()
{
    $('#overlay').attr('style','');
    $('#displayMessage').val('false');
}


function shippingAddress(e)
{
    // kid attached to account then proceed as normal
    // else popup and set value etc

    var displayMessage = $('#displayMessage').val();
    console.log(displayMessage)
    // if( displayMessage == 'false')
    // {

        var displayCalendarsOptions = $('#displayCalendarsOptions').val();
        console.log(' reeece ' + displayCalendarsOptions)
        // if(displayCalendarsOptions == 'true')
        // {
        //     $('#overlay2').attr('style','display:block');
        // }
        // else
        // {
            $('#shipping').attr('disabled',true);
            var url = window.location.href;
            if(url.includes('https') || url.includes('localhost'))
            {
                var basketItems = $('#basketItems').val();
                
                var displayShippingSection = $('#displayShippingSection').val();
                console.log(displayShippingSection);
                // before we do anything we need to check whether the user has any kids attached
                // if no kids attached display confirmation message
                if(basketItems > 0)
                {   
                    
                    if(displayShippingSection == 'true')
                    {
                        validateShippingDetails();
                    }
                    else
                    {
                        purchase(false);
                    }
                    
                }
            // need another condition in the case where account type = 2 and school deadline has passed
        
            }
            else
            {
                $('#buyError').text('To purchase you must be using a secure connection. Make sure the url for this site includes https:// and not http://');
            }
        
        // }
        
    // }
    // else
    // {
    //     // overlay pose question linked x y z

    //     $('#overlay').attr('style','display:block');
    // }
    
}

function validateShippingDetails()
{
    var fullName = $('#fullName').val();
    var addressLine1 = $('#addressLine1').val();
    var addressLine2 = $('#addressLine2').val();
    var city = $('#city').val();
    var postCode = $('#postCode').val();
    var country = $('#country').val();
    
    var data = {
                    fullName:fullName,
                    addressLine1:addressLine1,
                    addressLine2:addressLine2,
                    city:city,
                    postCode:postCode,
                    country:country
                };
    $('#fullNameError').text('');
    $('#addressLine1Error').text('');
    $('#addressLine2Error').text('');
    $('#cityError').text('');
    $('#postCodeError').text('');
    $.ajax({
        type:'post',
        url:'/validateShippingDetails',
        data:data,
        success:function(data)
        {
            var errors = data.errors;
            if(errors.fullName || errors.addressLine1 || errors.addressLine2 || errors.city || errors.postCode)
            {
                $('#shipping').attr('disabled',false);
                if(errors.fullName)
                {
                    $('#fullNameError').text(errors.fullName);
                }
                if(errors.addressLine1)
                {
                    $('#addressLine1Error').text(errors.addressLine1);
                }
                if(errors.addressLine2)
                {
                    $('#addressLine2Error').text(errors.addressLine2);
                }
                if(errors.city)
                {
                    $('#cityError').text(errors.city); 
                }
                if(errors.postCode)
                {
                    $('#postCodeError').text(errors.postCode);
                }
                
            }
            else
            {
                purchase(true);
            }
        }
    })
}

function purchase(isShipping)
{
    // $('#continue').attr('disabled',true);
    var total = $('#shipping').attr('data-total') *100;
    var subTotal1 = $('#shipping').attr('data-subTotal');
    console.log('subtotal ' + subTotal1);
    var basketItems = $('#basketItems').val();
    var line1;
    var line2;
    var city;
    var postCode;
    var fullName;
    var deliveryName = $('#deliveryName').val();
    var deliveryPrice = $('#deliveryPrice').val();
    var country = $('#country').val();

    var array = new Array();
    for(var i =0;i<basketItems;i++)
    {
        array.push($('#basket'+i).attr('data-basketItem'));
    }

    if(isShipping)
    {
        line1 = $('#addressLine1').val();
        line2 = $('#addressLine2').val();
        city = $('#city').val();
        postCode = $('#postCode').val();
        fullName = $('#fullName').val();
    }

    var url = window.location.href.replace('/basket','');
    console.log(url);
    if(url.includes('https') || url.includes('localhost'))
    {
        // $('#buyError').text('Orders are now closed');

        $.ajax({
            type: "POST",
            url:"/purchase",
            dataType: "json",
            data: {
                items:JSON.stringify(array),
                total:total,
                subTotal:subTotal1,
                isShipping:isShipping,
                line1:line1,
                line2:line2,
                city:city,
                postCode:postCode,
                fullName:fullName,
                deliveryPrice:deliveryPrice,
                deliveryName: deliveryName,
                country:country,
                url:url},
            success: function(data)
            {
               console.log(data.session);
                            stripe.redirectToCheckout({
                    // Make the id field from the Checkout Session creation API response
                    // available to this file, so you can provide it as parameter here
                    // instead of the {{CHECKOUT_SESSION_ID}} placeholder.
                    sessionId: data.session.id
                }).then(function (result) {
                    // If `redirectToCheckout` fails due to a browser or network
                    // error, display the localized error message to your customer
                    // using `result.error.message`.

                    console.log(result)
                });
            }
        })

    }
    else
    {
        $('#buyError').text('To purchase you must be using a secure connection. Make sure the url for this site includes https:// and not http://');
    }
        
        
     
    
}
