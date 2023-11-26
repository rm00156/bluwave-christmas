$(document).ready(function(){

    $('#linkKids').on('click', linkKids);
    $('#unLinkCancel').on('click', unLinkCancel);
    $('#unlinkKid').on('click',unlinkKid);
    $('#unLinkOk').on('click',unLinkOk);
    $('#unLinkNo').on('click',unLinkNo);
    $('#unLinkYes').on('click',unLinkYes);

})

var selectedUnlinkKidIds;

function unLinkYes(e)
{
    var accountId = $('#accountId').val();
   $.ajax({
       type:'post',
       url:'unlinkKids',
       data:{ids:selectedUnlinkKidIds},
       success:function(data)
       {
            window.location = '/account?id=' + accountId;
            // reload page
       }
   }) 
}

function unLinkNo(e)
{
    
    $('#overlay2').attr('style','display:none');
    $('#overlay3').attr('style','');
    
}

function unLinkOk(e)
{
    selectedUnlinkKidIds = new Array();
    var kidTotal = $('#kidTotal').val();
    var message = '';
    for( var i = 0; i < kidTotal ; i++ )
    {
        var row = $('#unlink' + i);
        
      if( row.is(':checked') )
      {
          var name = row.data('kidname');
          selectedUnlinkKidIds.push(row.data('kidid'));
          message = message + name + ', ';
      }
    }
    message = message.substr(0,message.length - 2);
   
    if(selectedUnlinkKidIds.length > 0)
    {
        $('#overlay3').attr('style','display:none');
    
        $('#overlay2').attr('style','');
        $('#areYouSureUnlink').html(' Are you sure you wish to unlink kid(s) ' + message + ' from this account?');
    }
}

function unlinkKid(e)
{

    $('#overlay3').attr('style','');
    
}

function unLinkCancel(e)
{
    $('#overlay3').attr('style','display:none');
}

function linkKids(e)
{
    var accountId = e.currentTarget.getAttribute('data-accountId');
    window.location = '/linkKids?accountId=' + accountId;
}

