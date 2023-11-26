var table = null;

$(document).ready(function(){
    
    $('#search').on('click', search);
    $('#clear').on('click', clear);
    table = $('#schoolTable').DataTable({searching: false, paging: true, info: false,
        columnDefs: [
            { width: '25%', targets: 0 },
            { width: '15%', targets: 1 },
            { width: '15%', targets: 2 },
            { width: '15%', targets: 3 },
            { width: '15%', targets: 4 },
            { width: '15%', targets: 5 },
          ]});
})


function clear()
{
    $("#nameSearch").val('');
    $("#addressSearch").val('');
    $("#postCodeSearch").val('');

    $('#emailSearch').val(0);
    $('#statuss').val(0);
}
   
function search()
{
    var nameSearch = $('#nameSearch').val();
    var addressSearch = $('#addressSearch').val();
    var postCodeSearch = $('#postCodeSearch').val();
    var emailSearch = $('#emailSearch').val();
    var status = $('#statuss').val();

    if(!(table == null || table == undefined))
    {
        table.destroy(); 
    }

    const data = {
        nameSearch:nameSearch,
        addressSearch:addressSearch,
        postCodeSearch:postCodeSearch,
        emailSearch:emailSearch,
        status:status
        }

        $.ajax({
            type: "POST",
            url:"/new_search_schools",
            dataType: "json",
            data:data,
            success: function(data)
            {
                var searchArray = data.result;
                $("#schoolTable tbody tr").remove();
                for( var i = 0; i < searchArray.length; i++ )
                {
                    var item = searchArray[i];
                    if(i== 0)
                    {
                        $('#schoolTable tbody').append('<tr class=\'clickable-row\' data-schoolnumber='+ item.schoolNumber + '>' + 
                        '<td>'+ item.name  + '</td>' + 
                        '<td style="word-wrap: break-word;">'+ item.address  + '</td>' + 
                        '<td>'+ item.postCode  + '</td>' + 
                        '<td>'+ item.type  + '</td>' + 
                        '<td>'+ item.email  + '</td>' + 
                        '<td>'+ item.school_createdDt  + '</td>' + 
                        '</tr>'); 
                    }
                    else
                    {
                        $('#schoolTable tr:last').after('<tr class=\'clickable-row\' data-schoolnumber='+ item.schoolNumber + '>' + 
                        '<td>'+ item.name  + '</td>' + 
                        '<td style="word-wrap: break-word;">'+ item.address  + '</td>' + 
                        '<td>'+ item.postCode  + '</td>' + 
                        '<td>'+ item.type  + '</td>' + 
                        '<td>'+ item.email  + '</td>' + 
                        '<td>'+ item.school_createdDt  + '</td>' + 
                        '</tr>');   
                    }
                    
                }

                $(".clickable-row").click(function() {
                    var schoolNumber = $(this).data("schoolnumber");
                    window.location = '/new_school_details?number=' + schoolNumber;
                });
                table = $('#schoolTable').DataTable({searching: false, paging: true, info: false,
                    columnDefs: [
                        { width: '25%', targets: 0 },
                        { width: '15%', targets: 1 },
                        { width: '15%', targets: 2 },
                        { width: '15%', targets: 3 },
                        { width: '15%', targets: 4 },
                        { width: '15%', targets: 5 },
                      ]});
            }
    })
}