var table = null;

$(document).ready(function(){
    
    $('#search').on('click', search);
    $('#clear').on('click', clear);
    table = $('#kidsTable').DataTable({searching: false, paging: true, info: false});
})

function clear()
{
    $("#kidNumber").val('');
    $("#name").val('');
    $('#school').val('');
    $('#class').val('');
}

function search()
{
    var kidNumber = $('#kidNumber').val();
    var name = $('#name').val();
    var school = $('#school').val();
    var schoolClass = $('#class').val();

    if(!(table == null || table == undefined))
    {
        table.destroy(); 
    }

    const data = {
        kidNumber:kidNumber,
        name:name,
        school:school,
        schoolClass:schoolClass
        }

    $.ajax({
        type: "POST",
        url:"/searchKidsNew",
        dataType: "json",
        data:data,
        success: function(data)
        {
            var searchArray = data.result;
            $("#kidsTable tbody tr").remove();
            for( var i = 0; i < searchArray.length; i++ )
            {
                var item = searchArray[i];
                if(i== 0)
                {
                    $('#kidsTable tbody').append('<tr class=\'clickable-row\' data-kidnumber='+ item.code + '>' + 
                    '<td>'+ item.code  + '</td>' + 
                    '<td>'+ item.name  + '</td>' + 
                    '<td>'+ (item.school ? item.school : '' ) + '</td>' + 
                    '<td>'+ (item.class ? item.class : '')  + '</td>' + 
                    '</tr>'); 
                }
                else
                {
                    $('#kidsTable tr:last').after('<tr class=\'clickable-row\' data-kidnumber='+ item.code + '>' + 
                    '<td>'+ item.code  + '</td>' + 
                    '<td>'+ item.name  + '</td>' + 
                    '<td>'+ (item.school ? item.school : '' ) + '</td>' + 
                    '<td>'+ (item.class ? item.class : '')  + '</td>' + 
                    '</tr>');   
                }
            }

            $(".clickable-row").click(function() {
                var kidNumber = $(this).data("kidnumber");
                window.location = '/kidProductItems?kidNumber=' + kidNumber;
            });
            table = $('#kidsTable').DataTable({searching: false, paging: true, info: false});
        }
    });
}