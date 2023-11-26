var table;
$(document).ready(function () {

    $('#search').on('click', search);
    $('#clear').on('click', clear);
});

const search = function(e)
{
    var name = $('#name').val();
    var email = $('#email').val();
    var accountType = $('#accountType').val() == 0 ? '' : $('#accountType').val();
    var createdDt = $('#date').val();
    var telephone = $('#telephone').val();
    
    if(!(table == null || table == undefined))
    {
        table.destroy();   
    }

    const data = {
        name:name,
        email:email,
        accountType:accountType,
        createdDt:createdDt,
        telephone:telephone
        };

        $.ajax({
            type: "POST",
            url:"/searchAccounts",
            dataType: "json",
            data:data,
            success: function(data)
            {
                var searchArray = data.result;
                $("#searchResultTable").find("tr:gt(0)").remove();
                for( var i = 0; i < searchArray.length; i++ )
                {
                    var item = searchArray[i];
                    if(i== 0)
                    {
                        $('#searchResultTable tbody').append('<tr class=\'clickable-row\' data-accountid='+ item.id + '>'  + 
                        '<td>'+ (item.name == null ? '' : item.name)  + '</td>' + 
                        '<td>'+ item.email  + '</td>' + 
                        '<td>'+ item.accountType  + '</td>' + 
                        '<td>'+ (item.telephone == null ? '' : item.telephone) + '</td>' + 
                        '<td>'+ item.createdDt  + '</td>' + 
                        '</tr>'); 
                    }
                    else
                    {
                        $('#searchResultTable tr:last').after('<tr class=\'clickable-row\' data-accountid='+ item.id + '>' + 
                        '<td>'+ (item.name == null ? '' : item.name)   + '</td>' + 
                        '<td>'+ item.email  + '</td>' + 
                        '<td>'+ item.accountType  + '</td>' + 
                        '<td>'+ (item.telephone == null ? '' : item.telephone) + '</td>' + 
                        '<td>'+ item.createdDt  + '</td>' + 
                        '</tr>');   
                    }
                    
                }

                $(".clickable-row").click(function() {
                    var accountId = $(this).data("accountid");
                    window.location = '/account?id=' + accountId;
                });
                table = $('#searchResultTable').DataTable();
            }
    })
}

const clear = function(e)
{
    $('#email').val('');
    $('#name').val('');
    $('#date').val('');
    $('#accountType').val(0);
    $('#telephone').val('');
}