var table;
$(document).ready(function () {

    $('#search').on('click', search);
    $('#clear').on('click', clear);
});


const search = function(e)
{
    var orderNumber = $('#orderNumber').val();
    var name =  $('#name').val();
    var code =  $('#code').val();
    var school = $('#school').val();
    var schoolClass = $('#class').val();
    var date = $('#date').val();
    var shipped = $('#shipped').is(':checked');
    if(!(table == null || table == undefined))
    {
        table.destroy();   
    }
    getSearchResults(school,orderNumber, name,code,schoolClass,date,shipped);
}

const getSearchResults = function(school,orderNumber, name,code,schoolClass,date,shipped){

    const data = {
        school:school,
        orderNumber:orderNumber,
        name:name,
        code:code,
        schoolClass:schoolClass,
        date:date,
        shipped:shipped
        }
$.ajax({
type: "POST",
url:"/searchOrders",
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
            console.log(item);
            $('#searchResultTable tbody').append(getRowBody(item)); 

    
        }
        else
        {
            $('#searchResultTable tr:last').after(getRowBody(item));   
        }
        
    }

    $(".clickable-row").click(function() {
        var orderId = $(this).data("orderid");
        window.location = '/order?id=' + orderId;
    });
   table = $('#searchResultTable').DataTable();
}
})

}

const getRowBody= function(item)
{
    var body ='<tr class=\'clickable-row\' data-orderid='+ item.id + '>' + 
    '<td>'+ (item.orderNumber == undefined ? '': item.orderNumber ) + '</td>' + 
    '<td>'+ (item.name  == undefined ? '': item.name ) + '</td>' + 
    '<td>'+ (item.code == undefined ? '': item.code ) + '</td>' + 
    '<td>'+ (item.schoolName == undefined ? '': item.schoolName)  + '</td>' + 
    '<td>'+ (item.className == undefined ? '': item.className)  + '</td>' + 
    '<td>'+ (item.purchaseDttm == undefined ? '': item.purchaseDttm)  + '</td>' +
    '<td>£'+ parseFloat(item.total).toFixed(2) +'</td>';
    
    // if(item.shippedFl == null )
    // {
    //     body = body + '<td>Not Available</td>';
    // }
    // else
    // {
    //     if(item.shippedFl == 1)
    //     {
    //         body = body + '<td>Sent</td>';
    //     }
    //     else
    //     {
    //         body = body + '<td>Not Sent</td>';
    //     }
    // }

    // if(item.shippedDttm == null )
    // {
    //     body = body + '<td>Not Available</td>';
    // }
    // else
    // {
    //     body = body + '<td>' + item.shippedDttm + '</td>'; 
    // }

    body = body + '</tr>';

    // console.log(body);
    return body;
}

const clear = function(e)
{
    $('#orderNumber').val('');
    $('#name').val('');
    $('#class').val('');
    $('#code').val('');
    $('#date').val('');
}