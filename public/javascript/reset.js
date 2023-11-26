$(document).ready(function(){

    $('#form').submit(function(e) {
        e.preventDefault();   

        resetPassword();
    });
})

function resetPassword()
{
    var password = $('#password').val();
    var rePassword = $('#rePassword').val();
    var email = $('#email').val();

    var data = {password:password, email:email};
    if(rePassword == password)
    {
        $.ajax({
            type:'post',
            url:'/resetPassword',
            data:data,
            success:function(data)
            {
                var errors = data.errors;
                if(errors == null)
                {
                    window.location = '/login?reset=success';
                }
                else
                {
                    $('#errors').text(errors.password);
                }
            }
        })
    }
    else
    {
        $('#errors').text("Passwords do not match");
    }
}