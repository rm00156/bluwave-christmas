
$(document).ready(function () {

    $("#schoolDropDown").change();
   // $('#classDropdown').change();
    });

const selectSchool = function()
{
    let schoolId =  $('#schoolDropDown').val();
    let yearId =  $('#yearDropdown').val();
    var dropdown = $("#classDropdown");

    console.log(dropdown);
    dropdown.empty();

    console.log(dropdown);
    $.ajax({
        type: "GET",
        url:"/getClasses?schoolId=" + schoolId + "&yearId=" + yearId,
        dataType: "json",
        success: function(data)
        {
            console.log(data);

            let div = $('#classKidDiv');
            if( div.length == 1 )
            {
                if(schoolId == 0 )
                {
                    div.css({"display":"none"});
                }
                else
                {
                   div.css({"display":""});
                }
                dropdown.append($("<option />").val(0).text("All"));  
            }


            for( let i=0;i<data.length;i++)
            {
                let dataValues =  data[i];
               
                dropdown.append($("<option />").val(dataValues.id).text(dataValues.name));
            }

            if( div.length == 1 )
            {
                selectClass();
            }
        }

    });

}

const selectClass = function()
{
    var classId = $("#classDropdown").val();
    var dropdown = $('#kidDropdown');
    dropdown.empty();
    $.ajax({
        type: "GET",
        url:"/getKids?classId=" + classId,
        dataType: "json",
        success: function(data)
        {
            let div = $('#kidDiv');
            if( div.length == 1 )
            {
                dropdown.append($("<option />").val(0).text("All"));
                if(classId == 0 )
                {
                    div.css({"display":"none"});
                }
                else
                  {
                      div.css({"display":""});
                      for( let i=0;i<data.length;i++)
                      {
                         let dataValues =  data[i];
                            
                        dropdown.append($("<option />").val(dataValues.id).text(dataValues.name));
                      }
                  } 

            }
        }
    });
}

const selectSchool2 = function()
{
    let schoolId =  $('#schoolDropDown').val();
    let yearId =  $('#yearDropdown').val();
    var dropdown = $("#classDropdown");

    console.log(dropdown);
    dropdown.empty();

    console.log(dropdown);
    $.ajax({
        type: "GET",
        url:"/getClasses?schoolId=" + schoolId + "&yearId=" + yearId,
        dataType: "json",
        success: function(data)
        {
            console.log(data);

            let div = $('#classKidDiv');
            if( div.length == 1 )
            {
                if(schoolId == 0 )
                {
                    div.css({"display":"none"});
                }
                else
                {
                   div.css({"display":""});
                }
                dropdown.append($("<option />").val(0).text("All"));  
            }


            for( let i=0;i<data.length;i++)
            {
                let dataValues =  data[i];
               
                dropdown.append($("<option />").val(dataValues.id).text(dataValues.name));
            }

            if( div.length == 1 )
            {
                selectClass();
            }
        }

    });

}


