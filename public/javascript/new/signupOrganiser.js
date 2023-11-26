var classCount = 1;
var classArray = [1];

jQuery(function(){

    $('#addClassRow').on('click', addClassRow);

    // $('form').on('submit',function(e) {
       
    //     e.preventDefault();

    //     classArray = JSON.stringify(classArray);
    //     var data = {data:classArray};


    // });
});


function addClassRow(e)
{
    classCount++;
    $('#classesRows').append('<div id="row' + classCount + '" class="row" style="margin-top:10px">' + 
        '<div class="col-sm-6">' + 
            '<label>Class Name</label>' +
            '<input class="form-control" required=true name="class' + classCount + '" type="text">' +
            '<p id="classError' + classCount + '" class="small text-danger"></p>' +
            '<input id="classArray' + classCount + '" name="classArray[]" value="' + classCount +'" style="display:none">' +
        
        '</div>' +
        '<div class="col-sm-6">' + 
            '<label style="color:#fff">f</label>' +
            '<div class="input-group">' + 
            '<button class="btn btn-danger mb-2 me-2" type="button" data-number=' + classCount + ' id="removeClassRow' + classCount + '" type="text" style="width:-webkit-fill-available">Remove</button>' +
            '</div>' +
        
        '</div>' +
    
    '</div>')

    $('#removeClassRow' + classCount).on('click', removeClassRow);
    classArray.push(classCount);
    console.log(classArray);
}

function removeClassRow(e)
{
    var number = e.currentTarget.getAttribute('data-number');
    $('#row' + number).remove();

    console.log(classArray)
    console.log(number)

    var index = getIndex(number);
    classArray.splice(index,1);

    console.log(classArray);

}

function getIndex(item)
{
    for(var i = 0; i < classArray.length; i++)
    {
        if(classArray[i] == item)
        {
            return i;
        }
    }

    return null;
}

function validateClasses()
{
    var success = true;
    for(var i = 0; i < classArray.length; i++)
    {
        $('#classError' + index).val('');
        var index = classArray(i);
        var classIndex = $('#class' + index).val();

        if(classIndex.length == 0)
        {
            $('#classError' + index).val('Class Name cannot be empty');
            success = false;
        }
            
    }

    return success;
}

function signup()
{
    
}