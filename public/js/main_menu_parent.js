// JavaScript Document


function menuItems() {
	
	var pTitle = "Parent";
	
	var homepage = "<a href='home.html'>Home</a>";
	var dashboardpage  = "<a href='dashboard.html'>Dashboard</a>";
	var linkchildpage  = "<a href='linkchild.html'>Link Child</a>";
	var cardspage  = "<a href='cards.html'>Cards</a>";
	
	
	var studentname = "Student Name";
	var agename  = "Age";
	var schoolname  = "School";
	var classname  = "Class";
	var cardname  = "Card Layout";
	
	
	 document.getElementById('pageTitle').innerHTML = pTitle;
	
	 document.getElementById('mitem1').innerHTML=homepage;
	 document.getElementById('mitem2').innerHTML=dashboardpage;
	 document.getElementById('mitem3').innerHTML=linkchildpage;
	 document.getElementById('mitem4').innerHTML=cardspage;
	
	
	 document.getElementById('cmitem1').innerHTML=studentname;
	 document.getElementById('cmitem2').innerHTML=agename;
	 document.getElementById('cmitem3').innerHTML=schoolname;
	 document.getElementById('cmitem4').innerHTML=classname;
	 document.getElementById('cmitem6').innerHTML=cardname;
}



