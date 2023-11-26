var valid = false;
$(document).ready(function(){

    $('#form').on('submit', onClick);
    
});

function onClick(e) {
    if(!valid)
    {
        e.preventDefault();
        const captcha = $('#g-recaptcha-response').val();
        var data = {captcha:captcha};
        $.ajax({
            type:'post',
            url:'/captcha',
            data:data,
            success:function(data)
            {
                var err = data.error;
                console.log(data);
                if(err)
                {
                    $('#captchaError').text('Please verify by completing the captcha');
                }
                else
                {
                    valid = true;
                    $('#form').submit();
                }
                
            }
        })  
    }    

    // console.log(e);
    

  }
