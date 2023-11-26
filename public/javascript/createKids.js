const addKid = function()
{
    var name = $('#name').val();
    var code = $('#code').val();
    var age = $('#age').val();
    var picture = $('#picture');
    var artwork = $('#artwork').val();
    var schoolDropdown = $('#schoolDropDown').val();
    var classDropdown = $('#classDropdown').val();
    var yearDropdown = $('#yearDropdown').val();
    var displaySchool = $('#displaySchool').is(':checked');
    var displayClass = $('#displayClass').is(':checked');
    var displayAge = $('#displayAge').is(':checked');

    console.log(picture);
    var data = {
        name:name,
        code:code,
        age:age,
        schoolDropdown:schoolDropdown,
        classDropdown:classDropdown,
        yearDropdown:yearDropdown,
        displaySchool:displaySchool,
        displayClass:displayClass,
        displayAge:displayAge,
        picture:picture,
        artwork:artwork
    }
    // $.ajax({
    //     type: "post",
    //     url:"/addKid",
    //     data:data,
    //     dataType: "json",
    //     success: function(data)
    //     {
    //         // reset everything
    //         $('#name').val('');
    //         $('#code').val('');
    //        $('#age').val('');
    //         $('#picture').val('');
    //          $('#artwork').val('');
    //          $("#schoolDropDown")[0].selectedIndex = 0;
    //          $('#displaySchool').prop("checked", true);
    //          $('#displayClass').prop("checked", true);
    //          $('#displayAge').prop("checked", true);
    //     },
    //     errorMessage:function(error)
    //     {

    //     }
    // });
}