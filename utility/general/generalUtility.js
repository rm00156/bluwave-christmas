
function makeCode() {
    var result = '';
    var characters = '23456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 7; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function pauseForTimeInSecond(seconds) {
    return new Promise(resolve => {
      setTimeout(resolve, seconds * 1000); 
    });
}

module.exports = {
    makeCode,
    pauseForTimeInSecond
}
