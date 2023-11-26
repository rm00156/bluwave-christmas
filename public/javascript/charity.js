$(document).ready(function(){


    $('#form').submit(function(e) {
        e.preventDefault();   


        var bankAcc = $('#bankAcc').val();
        var sortCode = $('#sortCode').val();
        var name = $('#name').val();
        var type = $('#type').val();
        var schoolId = $('#schoolId').val();
        var data = {type:type,bankAcc:bankAcc,sortCode:sortCode,name:name,schoolId:schoolId};
        $('#errorSortCode').text('');
        $('#errorBankAcc').text('');

        $.ajax({
            type:'post',
            url:'/confirmAmount',
            data:data,
            success:function(data)
            {
                var errors = data.errors;
                
                if(errors)
                {
                    console.log(errors);
                    if(errors.sortCode)
                        $('#errorSortCode').text(errors.sortCode);
                    
                    if(errors.bankAcc)
                        $('#errorBankAcc').text(errors.bankAcc);
                
                }
                else
                {
                    // TO-DO
                    // NEW SCREEN SUCCESSFULS
                    console.log('success');
                    window.location ='/organiserDashboard';
                }
            }
        })
    })
})