$(document).ready(function(){

    $('#changeOrganiser').on('click',changeOrganiser);
})


function changeOrganiser(e)
{
    // popup, are you sure you want to change the email for the organiser of this school
    
    var currentEmail = e.currentTarget.getAttribute('data-email');
    var newEmail = $('#email').val();
    var schoolId = e.currentTarget.getAttribute('data-schoolId');
    if(currentEmail == newEmail)
    {
        $('#errors').text('You must change the email address before attempting to update the organiser');
    }
    else
    {
        $('#errors').text('');
        var data = {email:newEmail,originalEmail:currentEmail, schoolId:schoolId};
        $.ajax({
            type:'post',
            url:'/changeOrganiser',
            data:data,
            success:function(data)
            {
                var errors = data.errors;

                if(errors)
                {
                    $('#errors').text(errors.email);
                }
                else
                {
                    window.location = '/school?id=' + schoolId;
                }
                
            }
        })
        // var reg = " \b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b";
        // if(newEmail.match(reg))
        // {
        //     $('#errors').text();
        // }
        // else
        // {
           
        // }
    }
    // $('#overlay').attr('style','display:block');
}
