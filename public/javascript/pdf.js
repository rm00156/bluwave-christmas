

const reece = function(card)
{
    console.log(card.path)
    pdfjsLib.getDocument('https://bluwavegroupdad.s3.eu-west-2.amazonaws.com/folder/1557174209814_abcd.pdf')
    .then(doc=>{
    
    console.log("this file has " +doc._pdfInfo.numPages + " pages");
    
        doc.getPage(1).then(page=>{
            var myCanvas= document.getElementById("my_canvas0");
            var context = myCanvas.getContext("2d");
            
            // 1 means the original size of the page
            var viewport= page.getViewport(myCanvas.width/ page.getViewport(1).width);
            
            page.render({
                canvasContext:context,
                viewport:viewport
            })
        })
});

}


