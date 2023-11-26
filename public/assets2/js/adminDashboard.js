$(document).ready(function(){

    var background = $('#background').val();
    console.log(background)
    $('#' + background + '-mode-check').prop( "checked", true );
    // $('input[type=checkbox][name=color-scheme-mode]').change();
    $('#' + background + '-check').prop('checked', true);
    $('body').attr('data-layout-color', background);

    $('#progressTable').DataTable({searching: false, pageLength:5, paging: true, info: false, ordering:false, lengthChange:false});
})