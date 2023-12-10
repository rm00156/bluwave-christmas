let table = null;

$(document).ready(() => {
  $('#search').on('click', search);
  $('#clear').on('click', clear);
  table = $('#productTable').DataTable({ searching: false, paging: true, info: false });
});

function clear() {
  $('#numberSearch').val('');
  $('#nameSearch').val('');
  $('#productType').val(0);
  $('#statuss').val(0);
}

function search() {
  const numberSearch = $('#numberSearch').val();
  const nameSearch = $('#nameSearch').val();
  const productType = $('#productType').val();
  const status = $('#statuss').val();

  if (!(table == null || table == undefined)) {
    table.destroy();
  }

  const data = {
    numberSearch,
    nameSearch,
    productType,
    status,
  };

  $.ajax({
    type: 'POST',
    url: '/searchProducts',
    dataType: 'json',
    data,
    success(data) {
      const searchArray = data.result;
      $('#productTable tbody tr').remove();
      for (let i = 0; i < searchArray.length; i++) {
        const item = searchArray[i];
        if (i == 0) {
          $('#productTable tbody').append(`<tr class='clickable-row' data-productnumber=${item.productNumber}>`
                        + `<td>${item.productNumber}</td>`
                        + `<td>${item.productType}</td>`
                        + `<td>${item.name}</td>`
                        + `<td>${item.status ? 'Inactive' : 'Active'}</td>`
                        + `<td>£${(parseFloat(item.price)).toFixed(2)}</td>`
                        + '</tr>');
        } else {
          $('#productTable tr:last').after(`<tr class='clickable-row' data-productnumber=${item.productNumber}>`
                        + `<td>${item.productNumber}</td>`
                        + `<td>${item.productType}</td>`
                        + `<td>${item.name}</td>`
                        + `<td>${item.status ? 'Inactive' : 'Active'}</td>`
                        + `<td>£${(parseFloat(item.price)).toFixed(2)}</td>`
                        + '</tr>');
        }
      }

      $('.clickable-row').click(function () {
        const productNumber = $(this).data('productnumber');
        window.location = `/new_product_details?number=${productNumber}`;
      });
      table = $('#productTable').DataTable({ searching: false, paging: true, info: false });
    },
  });
}
