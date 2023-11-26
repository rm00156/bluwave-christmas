pdfjsLib.getDocument(cardPath).then(doc=>{
                        
    doc.getPage(1).then(page=>{

      var myCanvas= document.getElementById("canvas");
      var context = myCanvas.getContext("2d");
      var firstColumn = document.getElementById("firstColumn");
              // 1 means the original size of the page
      var viewport= page.getViewport(250/ page.getViewport(1).width);
      page.render({
        canvasContext:context,
        viewport:viewport
    })
    })
 });