var briteChartApp = window.briteChartApp || {};
!(function (i, e) {
    "use strict";
    var c = ["#727cf5", "#0acf97", "#6c757d", "#fa5c7c", "#ffbc00", "#39afd1", "#e3eaef"];
    
        (e.createHorizontalBarChart = function (e, t) {
            var a = i(e).data("colors"),
                l = a ? a.split(",") : c.concat(),
                n = new britecharts.bar(),
                u = d3.select(e),
                o = !!u.node() && u.node().getBoundingClientRect().width,
                r = !!u.node() && u.node().getBoundingClientRect().height;
            n.colorSchema(l).isAnimated(!0).isHorizontal(!0).width(o).margin({ top: 10, left: 50, bottom: 20, right: 10 }).enableLabels(!0).percentageAxisToMaxRatio(1.3).labelsNumberFormat(1).height(r), u.datum(t).call(n);
        }),
        
        i(function () {
            var e = [
                    { name: "Order", value: $('#orderCount').val() },
                    { name: "Pupils", value: $('#totalKids').val() },
                ];
                
            function u() {
                d3.selectAll(".bar-chart").remove(),
                    d3.selectAll(".line-chart").remove(),
                    d3.selectAll(".donut-chart").remove(),
                    d3.selectAll(".britechart-legend").remove(),
                    d3.selectAll(".brush-chart").remove(),
                    d3.selectAll(".step-chart").remove(),
                    0 < i(".bar-container").length && briteChartApp.createBarChart(".bar-container", e),
                    0 < i(".bar-container-horizontal").length && briteChartApp.createHorizontalBarChart(".bar-container-horizontal", e),
                    0 < i(".line-container").length && briteChartApp.createLineChart(".line-container", t),
                    0 < i(".donut-container").length && briteChartApp.createDonutChart(".donut-container", a),
                    0 < i(".brush-container").length && briteChartApp.createBrushChart(".brush-container", l),
                    0 < i(".step-container").length && briteChartApp.createStepChart(".step-container", n);
            }
            i(window).on("resize", function (e) {
                e.preventDefault(), setTimeout(u, 200);
            }),
                u();
        });
})(jQuery, briteChartApp);
