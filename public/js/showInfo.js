// JavaScript Document


function showInfoOn1(a){	
document.getElementById(a).style.visibility="visible";
document.getElementById(a).innerHTML= "The 'Standard Pack' doesn't allow for the user to add a different image for the back thumbnail area";
}

function showInfoOff1(a){
document.getElementById(a).style.visibility="hidden";
}


function showInfoOn2(a){	
document.getElementById(a).style.visibility="visible";
document.getElementById(a).innerHTML= "The 'Photo Pack' allows the user to add their own image for the back thumbnail area";
}

function showInfoOff2(a){
document.getElementById(a).style.visibility="hidden";
}


function showInfoOn3(a){	
document.getElementById(a).style.visibility="visible";
document.getElementById(a).innerHTML= "This text is an Explanation for 'Calendar Pack'";
}

function showInfoOff3(a){
document.getElementById(a).style.visibility="hidden";	
}


function showLinkInfo(a){
document.getElementById(a).style.width="100%";

document.getElementById('s2').style.transition="all 2s";
}