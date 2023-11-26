var table = null;

$(document).ready(function(){
    
    $('#search').on('click', search);
    $('#clear').on('click', clear);
    table = $('#productTable').DataTable({searching: false, paging: true, info: false});
})


function clear()
{
    $("#idSearch").val('');
    $("#nameSearch").val('');
    $('#productType').val(0);
    $('#statuss').val(0);
}
   
function search()
{
    var idSearch = $('#idSearch').val();
    var nameSearch = $('#nameSearch').val();
    var productType = $('#productType').val();
    var status = $('#statuss').val();

    if(!(table == null || table == undefined))
    {
        table.destroy(); 
    }

    const data = {
        idSearch:idSearch,
        nameSearch:nameSearch,
        productType:productType,
        status:status
        }

        $.ajax({
            type: "POST",
            url:"/searchProducts",
            dataType: "json",
            data:data,
            success: function(data)
            {
                var searchArray = data.result;
                $("#productTable tbody tr").remove();
                for( var i = 0; i < searchArray.length; i++ )
                {
                    var item = searchArray[i];
                    if(i== 0)
                    {
                        $('#productTable tbody').append('<tr class=\'clickable-row\' data-productnumber='+ item.productNumber + '>' + 
                        '<td>'+ item.productNumber  + '</td>' + 
                        '<td>'+ item.productType  + '</td>' + 
                        '<td>'+ item.name  + '</td>' + 
                        '<td>'+ (item.status ? 'Inactive' : 'Active')  + '</td>' + 
                        '<td>£'+  (parseFloat(item.price1)).toFixed(2)  + '</td>' + 
                        '</tr>'); 
                    }
                    else
                    {
                        $('#productTable tr:last').after('<tr class=\'clickable-row\' data-productnumber='+ item.productNumber + '>' + 
                        '<td>'+ item.productNumber  + '</td>' + 
                        '<td>'+ item.productType  + '</td>' + 
                        '<td>'+ item.name  + '</td>' + 
                        '<td>'+ (item.status ? 'Inactive' : 'Active') + '</td>' + 
                        '<td>£'+ (parseFloat(item.price1)).toFixed(2)+ '</td>' + 
                        '</tr>');   
                    }
                    
                }

                $(".clickable-row").click(function() {
                    var productNumber = $(this).data("productnumber");
                    window.location = '/new_product_details?number=' + productNumber;
                });
                table = $('#productTable').DataTable({searching: false, paging: true, info: false});
            }
    })
}