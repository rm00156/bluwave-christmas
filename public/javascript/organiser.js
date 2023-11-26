$(document).ready(function(){

    const classTotal = $('#classTotal').val();
    console.log(classTotal);
    var path = $('#path').val();

    if(path == '/orders')
    {
        for( let i = 0; i < classTotal; i++)
        {
            $('#class'+i).on('click', selectClass);
        }
    
    }
    else
    {
        
        for( let i = 0; i < classTotal; i++)
        {
            console.log('reece');
            $('#participantClass'+i).on('click', selectParticipantClass);
        }
    }

    $('#schoolDetails').on('click', schoolDetails);

    if($('#classes').val() != undefined )
        $('#classes').DataTable();
    if($('#orderTable').val() != undefined )
        $('#orderTable').DataTable();
    if($('#kids').val() != undefined )
        $('#kids').DataTable();
        
});

function schoolDetails(e)
{
    window.location = '/school_details?schoolNumber=' + e.currentTarget.getAttribute("data-schoolNumber");
} 

function selectClass(e)
{
   window.location = '/classOrders?classId=' + e.currentTarget.getAttribute("data-classid");
}

function selectParticipantClass(e)
{
   window.location = '/classParticipants?classId=' + e.currentTarget.getAttribute("data-classid");
}