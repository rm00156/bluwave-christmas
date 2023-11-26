var table;
$(document).ready(function () {

    $('#search').on('click', search);
    $('#clear').on('click', clear);
});


const search = function(e)
{
    var school = $('#school').val();
    var address =  $('#address').val();
    var postCode =  $('#postCode').val();
    var status = $('#status').val() == 0 ? '' : $('#status').val();
    var email = $('#email').val();
    var createdDt = $('#date').val();

    if(!(table == null || table == undefined))
    {
        table.destroy();   
    }

    const data = {
                    school:school,
                    address:address,
                    postCode:postCode,
                    status:status,
                    email:email,
                    createdDt:createdDt
                    }
    $.ajax({
            type: "POST",
            url:"/searchSchool",
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
                        $('#searchResultTable tbody').append('<tr class=\'clickable-row\' data-schoolid='+ item.id + '>' + 
                        '<td style="width:25%">'+ item.name  + '</td>' + 
                        '<td style="width:15%">'+ item.address  + '</td>' + 
                        '<td style="width:15%">'+ item.postCode  + '</td>' + 
                        '<td style="width:15%">'+ item.type  + '</td>' + 
                        '<td style="width:15%">'+ item.email  + '</td>' + 
                        '<td style="width:15%">'+ item.createdDttm  + '</td>' + 
                        '</tr>'); 
                    }
                    else
                    {
                        $('#searchResultTable tr:last').after('<tr class=\'clickable-row\' data-schoolid='+ item.id + '>' + 
                        '<td style="width:25%">'+ item.name  + '</td>' + 
                        '<td style="width:15%">'+ item.address  + '</td>' + 
                        '<td style="width:15%">'+ item.postCode  + '</td>' + 
                        '<td style="width:15%">'+ item.type  + '</td>' + 
                        '<td style="width:15%">'+ item.email  + '</td>' + 
                        '<td style="width:15%">'+ item.createdDttm  + '</td>' + 
                        '</tr>');   
                    }
                    
                }

                $(".clickable-row").click(function() {
                    var schoolId = $(this).data("schoolid");
                    window.location = '/school?id=' + schoolId;
                });
                table = $('#searchResultTable').DataTable();
            }
    })
}

const clear = function(e)
{
    $('#school').val('');
    $('#address').val('');
    $('#postCode').val('');
    $('#email').val('');
    $('#createdDt').val('');
    $('#status').val(0);
    $('.select-selected').text('');
}