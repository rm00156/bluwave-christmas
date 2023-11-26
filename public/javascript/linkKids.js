
$(document).ready(function(){
    $('#link').on('click', linkKid);

    var age = $('#age').val();
    var month = $('#month').val();
    var name = $('#name').val();
    var code = $('#refCode1').val();

    if( age.length > 0 && month.length > 0 && name.length > 0 && code.length > 0)
    {
        $('#link').trigger('click');
    }
});

const linkKid = function(e)
{
    const kidCode = $('#refCode1').val();
    const kidName = $('#name').val();
    const kidAge = $('#age').val();
    var kidMonth = $('#month').val();
    
    if(kidCode == '' || kidName == '' || kidAge == '')
    {
        if(kidCode == '')
        {
            $('#errorCode').text('No Code has been entered');
        }

        if(kidName == '')
        {
             $('#errorName').text('No Name has been entered');    
        }
        if(kidAge == '')
        {
            $('#errorAge').text('No Age has been entered');    
        }   
    }
    else
    {
        var basket = $('#baskets').val();
        basket = (basket == undefined || basket == null) ? false : true;
        console.log(basket)
        // kidMonth = (kidMonth == "" ) ? 0 : kidMonth;
        // var accountLinkedByAdmin = $('#accountLinkedByAdmin').val();
        // var data = {kidCode:kidCode, kidName:kidName, kidAge:kidAge, kidMonth:kidMonth, accountLinkedByAdmin:accountLinkedByAdmin};
        
        // $.ajax({
        //     type:'post',
        //     url:"/linkKids",
        //     data:data,
        //     dataType: "json",
        //     success: function(data)
        //     {
        //         console.log(data)
        //         if(data.errors)
        //         {
        //             // display error message no kid with this ref code found
        //             $('#errors').text(data.errors.errors);
        //         }
        //         else if(basket)
        //         {
        //             window.location = "/basket";
        //         }
        //         else if(data.accountType != 1)
        //         {    
        //             window.location = '/productItem?productNumber=' + data.productItem.productNumber + '&kidCode=' + data.code;
        //         }
        //         else
        //         {
        //             window.location = '/account?id=' + accountLinkedByAdmin;
        //         }
        //     }
        // }); 
    }
  
}

const add = function()
{
    var index = $('#index').val();
    $('#inputs').append("<input id=\"refCode"+ index + "\" name=\"refCode"+ index + "\" class=\"form-control\" type=\"text\" placeholder='Please enter your kids reference code' >");

    index++;
    $('#index').val(index);
}

const minus = function()
{
    var index = $('#index').val();
    index--;
    $('#refCode'+index).remove();
    
    $('#index').val(index);
}

