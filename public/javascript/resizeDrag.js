// import interact from 'interactjs';
$(document).ready(function(){

    $('#button').on('click',button);
});

function button(e)
{

    var name = $('#name');
    var nameX = name.attr('data-x');
    var nameY = name.attr('data-y');
    var nameHeight = name[0].clientHeight;
    var nameWidth = name[0].clientWidth;

    console.log(nameY);
    console.log(nameX)
    console.log(name.val());
    console.log(nameWidth);
    console.log(nameHeight);
    var image = $('#image');
    var x = image.attr('data-x');
    var y = image.attr('data-y');
    var height = image[0].height;
    var width = image[0].width;
    
    console.log(image);
    var data = {x:x,y:y, height:height, width:width, name:name.val(), nameX:nameX,nameY:nameY,nameHeight:nameHeight,nameWidth:nameWidth};

    $.ajax({
        url:'/testTrial',
        type:'post',
        data:data,
        success:function(data)
        {
            console.log('hello');
        }
    })
}


    interact('.resize-drag')
.draggable({
    onmove: window.dragMoveListener,
    modifiers: [
    interact.modifiers.restrictRect({
        restriction: 'parent'
    })
    ]
})
.resizable({
    // resize from all edges and corners
    edges: { left: true, right: true, bottom: true, top: true },

    modifiers: [
    // keep the edges inside the parent
    interact.modifiers.restrictEdges({
        outer: 'parent',
        endOnly: true
    }),

    // minimum size
    interact.modifiers.restrictSize({
        min: { width: 100, height: 50 }
    })
    ],

    inertia: true
})
.on('resizemove', function (event) {
    var target = event.target
    var x = (parseFloat(target.getAttribute('data-x')) || 0)
    var y = (parseFloat(target.getAttribute('data-y')) || 0)

    // update the element's style
    target.style.width = event.rect.width + 'px'
    target.style.height = event.rect.height + 'px'

    // translate when resizing from top or left edges
    x += event.deltaRect.left
    y += event.deltaRect.top

    target.style.webkitTransform = target.style.transform =
        'translate(' + x + 'px,' + y + 'px)'

    target.setAttribute('data-x', x)
    target.setAttribute('data-y', y)
    target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
});


interact('.resize-drag2')
.draggable({
    onmove: window.dragMoveListener,
    modifiers: [
    interact.modifiers.restrictRect({
        restriction: 'parent'
    })
    ]
})
.resizable({
    // resize from all edges and corners
    edges: { left: true, right: true, bottom: true, top: true },

    modifiers: [
    // keep the edges inside the parent
    interact.modifiers.restrictEdges({
        outer: 'parent',
        endOnly: true
    }),

    // minimum size
    interact.modifiers.restrictSize({
        min: { width: 100, height: 50 }
    })
    ],

    inertia: true
})
.on('resizemove', function (event) {
    var target = event.target
    var x = (parseFloat(target.getAttribute('data-x')) || 0)
    var y = (parseFloat(target.getAttribute('data-y')) || 0)

    // update the element's style
    target.style.width = event.rect.width + 'px'
    target.style.height = event.rect.height + 'px'

    // translate when resizing from top or left edges
    x += event.deltaRect.left
    y += event.deltaRect.top

    target.style.webkitTransform = target.style.transform =
        'translate(' + x + 'px,' + y + 'px)'

    target.setAttribute('data-x', x)
    target.setAttribute('data-y', y)
    target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
})



interact('.draggable')
  .draggable({
    // enable inertial throwing
    inertia: true,
    // keep the element within the area of it's parent
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ],
    // enable autoScroll
    autoScroll: true,

    // call this function on every dragmove event
    onmove: dragMoveListener,
    // call this function on every dragend event
    onend: function (event) {
      var textEl = event.target.querySelector('p')

      textEl && (textEl.textContent =
        'moved a distance of ' +
        (Math.sqrt(Math.pow(event.pageX - event.x0, 2) +
                   Math.pow(event.pageY - event.y0, 2) | 0))
          .toFixed(2) + 'px')
    }
  })

function dragMoveListener (event) {
  var target = event.target
  // keep the dragged position in the data-x/data-y attributes
  var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
  var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

  // translate the element
  target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px)'

  // update the posiion attributes
  target.setAttribute('data-x', x)
  target.setAttribute('data-y', y)
}

// this is used later in the resizing and gesture demos
window.dragMoveListener = dragMoveListener


