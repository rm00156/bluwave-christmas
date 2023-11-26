
var table = null;

$(document).ready(function(){
    
    $('#search').on('click', search);
    $('#clear').on('click', clear);
    table = $('#orderTable').DataTable({searching: false, paging: true, info: false});
})


function clear()
{
    $("#orderNumber").val('');
    $("#kidName").val('');
    $("#kidCode").val('');

    $('#school').val('');
    $('#class').val('');
    $('#fromDt').val('');
    $('#toDt').val('');
}
   
function search()
{
    var orderNumber = $("#orderNumber").val();
    var kidName = $("#kidName").val();
    var kidCode = $("#kidCode").val();

    var school = $('#school').val();
    var schoolClass = $('#class').val();
    var fromDt = $('#fromDt').val();
    var toDt = $('#toDt').val();

    if(!(table == null || table == undefined))
    {
        table.destroy(); 
    }

    const data = {
        orderNumber:orderNumber,
        kidName:kidName,
        kidCode:kidCode,
        school:school,
        schoolClass:schoolClass,
        fromDt:fromDt,
        toDt:toDt
        }

        $.ajax({
            type: "POST",
            url:"/new_search_orders",
            dataType: "json",
            data:data,
            success: function(data)
            {
                var searchArray = data.result;
                console.log(searchArray)
                $("#orderTable tbody tr").remove();
                for( var i = 0; i < searchArray.length; i++ )
                {
                    var item = searchArray[i];
                    if(i== 0)
                    {
                        $('#orderTable tbody').append('<tr class=\'clickable-row\' data-ordernumber='+ item.orderNumber + '>' + 
                        '<td>'+ item.orderNumber  + '</td>' + 
                        '<td>'+ (item.kidName == undefined ? '' : item.kidName) + '</td>' + 
                        '<td>'+ (item.kidCode == undefined ? '' : item.kidCode) + '</td>' + 
                        '<td>'+ (item.school == null ? '' : item.school) + '</td>' + 
                        '<td>'+ (item.schoolClass == null ? '' : item.schoolClass) + '</td>' + 
                        '<td>'+ item.purchaseDttm + '</td>' + 
                        '<td>£'+ (parseFloat(item.subTotal)).toFixed(2) + '</td>' + 
                        '<td>£'+ (parseFloat(item.total)).toFixed(2) + '</td>' + 
                        '</tr>'); 
                    }
                    else
                    {
                        $('#orderTable tr:last').after('<tr class=\'clickable-row\' data-ordernumber='+ item.orderNumber + '>' + 
                        '<td>'+ item.orderNumber  + '</td>' + 
                        '<td>'+ (item.kidName == undefined ? '' : item.kidName) + '</td>' + 
                        '<td>'+ (item.kidCode == undefined ? '' : item.kidCode) + '</td>' + 
                        '<td>'+ (item.school == null ? '' : item.school) + '</td>' + 
                        '<td>'+ (item.schoolClass == null ? '' : item.schoolClass) + '</td>' + 
                        '<td>'+ item.purchaseDttm + '</td>' + 
                        '<td>£'+ (parseFloat(item.subTotal)).toFixed(2) + '</td>' + 
                        '<td>£'+ (parseFloat(item.total)).toFixed(2) + '</td>' + 
                        '</tr>'); 
                    }
                    
                }

                $(".clickable-row").click(function() {
                    var orderNumber = $(this).data("ordernumber");
                    window.location = '/new_order_details?orderNumber=' + orderNumber;
                });
                table = $('#orderTable').DataTable({searching: false, paging: true, info: false});
            }
    })
}