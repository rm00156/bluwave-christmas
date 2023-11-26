$(document).ready(function(){

    $('#schools').on('click', searchSchool);
    $('#classes').on('click', searchClasses);
    $('#kids').on('click', searchKids);
    $('#orders').on('click', searchOrders);
    $('#accounts').on('click', searchAccounts);
    $('#ordersNotShipped').on('click',ordersNotShipped);
})

function hoverStateOn1() {
    document.getElementById('admin').style.backgroundColor = "#33cc33"; 
}
    
function hoverStateOn2() {	
    document.getElementById('schools').style.backgroundColor = "#33cc33"; 
}
    
function hoverStateOn3() {	
    document.getElementById('classes').style.backgroundColor = "#33cc33"; 
}
function hoverStateOn4() {
    document.getElementById('kids').style.backgroundColor = "#33cc33"; 
}

function hoverStateOn5() {
    document.getElementById('orders').style.backgroundColor = "#33cc33"; 
}

function hoverStateOn6() {
    document.getElementById('accounts').style.backgroundColor = "#33cc33"; 
}

function hoverStateOn10() {
    document.getElementById('ordersNotShipped').style.backgroundColor = "#33cc33"; 
}

function searchSchool()
{
    window.location ='/searchSchool';
}

function searchClasses()
{
    window.location ='/searchClass';
}

function searchKids()
{
    window.location ='/searchKids';
}

function searchOrders()
{
    window.location ='/searchOrders';
}

function ordersNotShipped()
{
    window.location = '/ordersNotShipped';
}
function searchAccounts()
{
    window.location ='/searchAccounts';
}

function hoverStateOff1() {
    document.getElementById('admin').style.backgroundColor = "#075F5E"; 
}

function hoverStateOff6() {
    document.getElementById('accounts').style.backgroundColor = "#075F5E"; 
}
    
function hoverStateOff2() {	
    document.getElementById('schools').style.backgroundColor = "#075F5E"; 
}
    
function hoverStateOff3() {	
    document.getElementById('classes').style.backgroundColor = "#075F5E"; 
}
function hoverStateOff4() {
    document.getElementById('kids').style.backgroundColor = "#075F5E"; 
}

function hoverStateOff5() {
    document.getElementById('orders').style.backgroundColor = "#075F5E"; 
}

function hoverStateOff10() {
    document.getElementById('ordersNotShipped').style.backgroundColor = "#075F5E"; 
}