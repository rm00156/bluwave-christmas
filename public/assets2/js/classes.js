var classId;
$(document).ready(function(){


    $('#addNewClass').on('click', setUpAddNewClass);
    $('#cancelNewClass').on('click', cancelNewClass);
    $('#submitNewClass').on('click', submitNewClass);
    $('#submitRemoveClass').on('click', submitRemoveClass);
    $('#cancelRemoveClass').on('click', cancelRemoveClass);

    setupNumberOfClasses();
    $('#classes').DataTable({searching: false});
});

function setupNumberOfClasses()
{
    var numberOfClasses = $('#numberOfClasses').val();
    if(numberOfClasses != undefined)
    {
        for(var i = 0; i < numberOfClasses; i++)
        {
            $('#class' + i).on('click', navigate);
            $('#remove' + i).on('click', removeClass);
        }
    }
}

function navigate(e)
{
    var classNumber = e.currentTarget.getAttribute('data-classNumber');
    window.location = 'classes?number=' + classNumber;
}

function removeClass(e)
{
    var className = e.currentTarget.getAttribute('data-className');
    $('#removeText').text('Are you sure you want to remove class ' + className + '?');
    $('#overlay2').attr('style','display:block');
    classId = e.currentTarget.getAttribute('data-classId');
}

function submitRemoveClass(e)
{
    $.ajax({
        type:'post',
        url: '/removeClass',
        data:{classId:classId},
        success:function(data)
        {
            if(data.errors)
            {
                $('#errorRemoveClass').text("Class couldn't be deleted due to a kid already existing which is part of class");
                return;
            }
            
            window.location = '/participants'
        }
    })
}

function setUpAddNewClass()
{
    $('#overlay').attr('style','display:block');
}

function cancelNewClass()
{
    $('#newClass').val('');
    $('#overlay').attr('style','display:none');
}

function cancelRemoveClass()
{
    $('#overlay2').attr('style','display:none');
}


function submitNewClass(e)
{
    var className = $('#newClass').val();
    var schoolId = e.currentTarget.getAttribute('data-schoolId');

    if(className == '')
    {
        $('#errorClass').text('Please enter a value');
        return;
    }
        

    $.ajax({
        type:'post',
        url: '/addNewClass',
        data:{className:className, schoolId:schoolId},
        success:function(data)
        {
            if(data.errors)
            {
                $('#errorClass').text('A class with this name already exists');
                return;
            }
            
            window.location = '/participants'
        }
    })
}

