var table = null;

$(document).ready(function(){
    
    $('#search').on('click', search);
    $('#clear').on('click', clear);
    table = $('#accountTable').DataTable({searching: false, paging: true, info: false});
})


function clear()
{
    $("#accountNumber").val('');
    $("#name").val('');
    $("#email").val('');
    $('#accountType').val(0);
    $('#phoneNumber').val('');
    $('#createdFrom').val('');
    $('#createdTo').val('');
}
   
function search()
{
    var accountNumber = $('#accountNumber').val();
    var name = $('#name').val();
    var accountType = $('#accountType').val();
    var email = $('#email').val();
    var phoneNumber = $('#phoneNumber').val();
    var createdFrom = $('#createdFrom').val();
    var createdTo = $('#createdTo').val();

    if(!(table == null || table == undefined))
    {
        table.destroy(); 
    }

    const data = {
        accountNumber:accountNumber,
        accountType:accountType,
        email:email,
        name:name,
        phoneNumber:phoneNumber,
        createdFrom:createdFrom,
        createdTo:createdTo
        }

        $.ajax({
            type: "POST",
            url:"/searchAccounts",
            dataType: "json",
            data:data,
            success: function(data)
            {
                var searchArray = data.result;
                $("#accountTable tbody tr").remove();
                for( var i = 0; i < searchArray.length; i++ )
                {
                    var item = searchArray[i];
                    if(i== 0)
                    {
                        $('#accountTable tbody').append('<tr class=\'clickable-row\' data-accountnumber='+ item.accountNumber + '>' + 
                        '<td>'+ item.accountNumber  + '</td>' + 
                        '<td>'+ (item.name == null ? '' : item.name )  + '</td>' + 
                        '<td>'+ item.email  + '</td>' + 
                        '<td>'+ item.accountType  + '</td>' + 
                        '<td>'+ (item.telephone == null ? '' : item.telephone) + '</td>' + 
                        '<td>'+ (item.createdDt == null ? '' : item.createdDt)  + '</td>' + 
                        '</tr>'); 
                    }
                    else
                    {
                        $('#accountTable tr:last').after('<tr class=\'clickable-row\' data-accountnumber='+ item.accountNumber + '>' + 
                        '<td>'+ item.accountNumber  + '</td>' + 
                        '<td>'+ (item.name == null ? '' : item.name )   + '</td>' + 
                        '<td>'+ item.email  + '</td>' + 
                        '<td>'+ item.accountType  + '</td>' + 
                        '<td>'+ (item.telephone == null ? '' : item.telephone)  + '</td>' + 
                        '<td>'+ (item.createdDt == null ? '' : item.createdDt)  + '</td>' + 
                        '</tr>'); 
                    }
                    
                }

                $(".clickable-row").click(function() {
                    var accountNumber = $(this).data("accountnumber");
                    window.location = '/new_account_details?number=' + accountNumber;
                });
                table = $('#accountTable').DataTable({searching: false, paging: true, info: false});
            }
    })
}