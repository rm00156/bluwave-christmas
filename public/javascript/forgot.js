$(document).ready(function(){


    $('#form').submit(function(e) {
        e.preventDefault();   

        sendResetEmail();
    });
})


function sendResetEmail()
{
    var email = $('#email').val();
    $.ajax({
        type:'post',
        url:'/forgottenPassword',
        data:{email:email},
        success:function(data)
        {
            var errors = data.errors;

            if(errors == null )
            {
                window.location = '/resetSent'
            }
            else
            {
                $('#errors').text(errors);
            }
        }
    })
}