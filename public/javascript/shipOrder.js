var video = document.createElement("video");
var canvasElement = document.getElementById("canvas");
var canvas = canvasElement.getContext("2d");
var loadingMessage = document.getElementById("loadingMessage");
var outputContainer = document.getElementById("output");
var outputMessage = document.getElementById("outputMessage");
var outputData = document.getElementById("outputData");

$(document).ready(function(){

// Use facingMode: environment to attempt to get the front camera on phones

$('#buttonClick').on('click', buttonClick);
$('#stop').on('click', stop);
});

function buttonClick(e)
{
    $('#qr').attr("style","");
    $('#buttonClick').attr("style","display:none");
    $('#image').attr("style","display:none");
    $('#stop').attr("style","margin-top:60px");
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
        video.play();
        requestAnimationFrame(tick);
        window.localStream = stream;
    });  
}

function stop()
{
    $('#qr').attr("style","margin-top:10px;display:none");
    $('#buttonClick').attr("style","margin-top:10px");
    $('#image').attr("style","width:60%");
    $('#stop').attr("style","display:none");
    
    localStream.getVideoTracks()[0].stop();

}

function drawLine(begin, end, color) {
    canvas.beginPath();
    canvas.moveTo(begin.x, begin.y);
    canvas.lineTo(end.x, end.y);
    canvas.lineWidth = 4;
    canvas.strokeStyle = color;
    canvas.stroke();
    }

function tick() {
    loadingMessage.innerText = "Loading video..."
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
    loadingMessage.hidden = true;
    canvasElement.hidden = false;
    outputContainer.hidden = false;

    canvasElement.height = 300;
    canvasElement.width = 300;
    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
    var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
    var code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
    });
    if (code) {
        drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
        drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
        drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
        drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
        outputMessage.hidden = true;
        outputData.parentElement.hidden = false;

        var purchaseBasketId = (code.data).replaceAll('blu-');

        $.ajax({
            type:'post',
            url:'/setToShipped',
            data:{purchaseBasketId:purchaseBasketId},
            success:function(data)
            {
                var error = data.error;
                if(error)
                {
                    console.log(error);
                }
                else
                {
                    window.location = '/shipped';
                }
            }
        })
            
        } else {
            outputMessage.hidden = false;
            outputData.parentElement.hidden = true;
        }
    }
    requestAnimationFrame(tick);
}