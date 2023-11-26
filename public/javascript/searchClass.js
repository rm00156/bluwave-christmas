var table;
$(document).ready(function () {

    $('#search').on('click', search);
    $('#clear').on('click', clear);
});


const search = function(e)
{
    var school = $('#school').val();
    var schoolClass =  $('#class').val();
    var year =  $('#year').val();
    
    if(!(table == null || table == undefined))
    {
        table.destroy();   
    }
    const data = {
                    school:school,
                    class:schoolClass,
                    year:year
                    }
    $.ajax({
            type: "POST",
            url:"/searchClass",
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
                        $('#searchResultTable tbody').append('<tr class=\'clickable-row\' data-classid='+ item.id + '>' + 
                        '<td>'+ item.name  + '</td>' + 
                        '<td>'+ item.year  + '</td>' + 
                        '<td>'+ item.school  + '</td>' + 
                        '</tr>');
                    }
                    else
                    {
                        $('#searchResultTable tr:last').after('<tr class=\'clickable-row\' data-classid='+ item.id + '>' + 
                                            '<td>'+ item.name  + '</td>' + 
                                            '<td>'+ item.year  + '</td>' + 
                                            '<td>'+ item.school  + '</td>' + 
                                            '</tr>');
                    }

                    
                }

                $(".clickable-row").click(function() {
                    var classId = $(this).data("classid");
                    window.location = '/class?id=' + classId;
                });
                table = $('#searchResultTable').DataTable();
            }
    })
}

const clear = function(e)
{
    $('#school').val('');
    $('#class').val('');
    $('#year').val('');
}