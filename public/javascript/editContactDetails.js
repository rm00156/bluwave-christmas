$(document).ready(function(){


    $('#updateDetails').on('click',updateDetails);
    $('#goToSchool').on('click',goToSchool);
    $('#changeOrganiser').on('click',changeOrganiser);
});

function changeOrganiser(e)
{
    var schoolId = e.currentTarget.getAttribute('data-schoolId');
    window.location = '/changeOrganiser?schoolId=' + schoolId;
}

function goToSchool(e)
{
    var schoolId = e.currentTarget.getAttribute('data-schoolId');
    window.location = '/school?id=' + schoolId;
}

function updateDetails(e)
{
    var schoolId = e.currentTarget.getAttribute('data-schoolId');
    var currentSchool = e.currentTarget.getAttribute('data-school');
    var newSchool = $('#school').val();
    var currentAddress = e.currentTarget.getAttribute('data-address');
    var newAddress = $('#address').val();
    var currentPostCode = e.currentTarget.getAttribute('data-postCode');
    var newPostCode = $('#postCode').val();
    var currentNumber = e.currentTarget.getAttribute('data-number');
    var newNumber = $('#telephoneNo').val();
    var currentNumberOfKidsPerClass = e.currentTarget.getAttribute('data-numberOfKidsPerClass');
    var newNumberOfKidsPerClass = $('#numberOfKidsPerClass').val();
    var currentName = e.currentTarget.getAttribute('data-name');
    var newName = $('#name').val();
    var currentAdditionalInfo = e.currentTarget.getAttribute('data-additionalInfo');
    var newAdditionalInfo = $('#additionalInfo').val();

    console.log(currentAdditionalInfo);
    console.log(newAdditionalInfo)
    
    if(currentAddress == newAddress && currentPostCode == newPostCode && currentNumber == newNumber && currentName == newName 
         && currentSchool == newSchool && currentNumberOfKidsPerClass == newNumberOfKidsPerClass && currentAdditionalInfo == newAdditionalInfo)
    {
        $('#errors').text('No changes have been made to the schools contact details, so no update was made');
    }
    else
    {
        // send to server
        $('#errors').text('');
        $('#errorAddress').text('');
        $('#errorPostCode').text('');
        $('#errorTelephoneNo').text('');
        $('#errorName').text('');
        $('#errorrSchool').text('');
        $('#errorrNumberOfKidsPerClass').text('');
        var data = {address:newAddress, postCode:newPostCode, telephoneNo:newNumber, schoolId:schoolId, name:newName,
             school: newSchool, numberOfKidsPerClass: newNumberOfKidsPerClass, additionalInfo: newAdditionalInfo};
        $.ajax({
            type:'post',
            url:'/edit_school_details',
            data:data,
            success:function(data)
            {
                var errors = data.errors;
                if(errors)
                {
                    if(errors.address)
                        $('#errorAddress').text(errors.address);
                    
                    if(errors.postCode)
                        $('#errorPostCode').text(errors.postCode);

                    if(errors.telephoneNo)
                        $('#errorTelephoneNo').text(errors.telephoneNo);

                    if(errors.name)
                        $('#errorName').text(errors.name);
                    
                    if(errors.numberOfKidsPerClass)
                        $('#errorNumberOfKidsPerClass').text(errors.numberOfKidsPerClass);
                        
                }
                else
                {
                    var accountType = $('#accountType').val();
                    if( accountType == 1)
                        window.location = '/schoolDetails?schoolNumber=' + schoolId;
                    else
                        window.location ='/organiserDashboard';
                }
            }
        })
    }
}