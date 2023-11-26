$(document).ready(function(){
    var colors = ["#fa6767"],
    dataColors = $("#basic-area").data("colors");
dataColors && (colors = dataColors.split(","));

$.ajax({
    type:'get',
    url:'/getRevenues',
    data:{},
    success:function(data)
    {
        console.log(data)
        console.log(data.revenues)
        var array = new Array();
        var revenues = data.revenues;
        revenues.forEach(function(element){
            array.push([element.dates, (element.subTotal).toFixed(2)])
        });
        var options = {
            chart: { height: 380, type: "area", zoom: { enabled: !1 } },
            dataLabels: { enabled: !1 },
            stroke: { width: 3, curve: "straight" },
            colors: colors,
            series: [{ name: "Revenue", data: array }],
            labels: [],
            xaxis: { type: "datetime", title: { text: "Date" } },
            yaxis: { opposite: 0, title: { text: "Revenue (£)" } },
            legend: { horizontalAlign: "left" },
            grid: { borderColor: "#f1f3fa" },
            responsive: [{ breakpoint: 600, options: { chart: { toolbar: { show: !1 } }, legend: { show: !1 } } }],
        },
        chart = new ApexCharts(document.querySelector("#basic-area"), options);
    chart.render();
    

    }
})


})

