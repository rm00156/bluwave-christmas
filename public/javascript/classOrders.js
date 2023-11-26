$(document).ready(function(){

    $('#orderTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
        {
             extend: 'csv',
                //Name the CSV
                filename: $('#className').val() + '_Orders', 
        }]
    } ); 
})
