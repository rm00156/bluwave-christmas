$(document).ready(function(){

    $('#updatePassword').on('click', updatePassword);
})

function updatePassword(e)
{
    var password = $('#password').val();
    var repeat = $('#repeat').val();

    var data = {password:password,repeat:repeat};
    $.ajax({
        type:'post',
        url:'/updatePassword',
        data:data,
        success:function(data){

            var errors = data.errors;

            if(errors)
            {
                $('#errors').text(errors);
            }
            else
            {
                window.location = '/organiserDashboard';
            }
        }
    })
}