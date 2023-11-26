// const test = function(e)
// {
//     var data ={url:"https://s3.eu-west-2.amazonaws.com/bluwavegroupdad/jpojp;kop'/2019/ggg/1559913252239_hhh_m;,.pdf"}
//     $.ajax({
//         type:"POST",
//         url:"/test",
//         dataType:"json",
//         data:data,
//         success: function(data){
//             console.log(data);
//         }
//     })
// }

$(document).ready(function(){

    $('#home').on('click',reece);
})

const reece = function()
{
    $.ajax({
            type: "post",
            url: "/tester",
            dataType: "text",
            success: function(data) {

                

               // console.log(data);
            }
         });
}