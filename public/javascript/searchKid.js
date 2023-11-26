var table;
$(document).ready(function () {

    $('#search').on('click', search);
    $('#clear').on('click', clear);
    
    
});


const search = function(e)
{
    var name= $('#name').val();
    var age= $('#age').val();
    var cardCode = $('#cardCode').val();
    var school = $('#school').val();
    var schoolClass =  $('#class').val();
    var year =  $('#year').val();
    
    if(!(table == null || table == undefined))
    {
        table.destroy();   
    }
    const data = {
                    name:name,
                    age:age,
                    cardCode:cardCode,
                    school:school,
                    class:schoolClass,
                    year:year
                    }
    $.ajax({
            type: "POST",
            url:"/searchKids",
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
                        $('#searchResultTable tbody').append('<tr class=\'clickable-row\' data-kidid='+ item.kidId + '>' + 
                        '<td>'+ item.name  + '</td>' + 
                        '<td>'+ item.age  + '</td>' + 
                        '<td>'+ item.schoolName  + '</td>' + 
                        '<td>'+ item.className  + '</td>' + 
                        '<td>'+ item.year + '</td>' + 
                        '<td>'+ item.code  + '</td>' +
                        '</tr>');
                    }
                    else
                    {
                        $('#searchResultTable tr:last').after('<tr class=\'clickable-row\' data-kidid='+ item.kidId + '>' + 
                            '<td>'+ item.name  + '</td>' + 
                            '<td>'+ item.age  + '</td>' + 
                            '<td>'+ item.schoolName  + '</td>' + 
                            '<td>'+ item.className  + '</td>' + 
                            '<td>'+ item.year + '</td>' + 
                            '<td>'+ item.code  + '</td>' +
                            '</tr>');
                    }
                    
                    
                   
                }

                $(".clickable-row").click(function() {
                    var kidId = $(this).data("kidid");
                    window.location = '/kid?id=' + kidId + '&selectedPackage=1';
                });
               table = $('#searchResultTable').DataTable();
            }
    })
}

const clear = function(e)
{
    $('#name').val('');
    $('#age').val('');
    $('#cardCode').val('');
    $('#school').val('');
    $('#class').val('');
    $('#year').val('');
}