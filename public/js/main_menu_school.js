// JavaScript Document


function menuItems() {
	
	var pTitle = "School";
	
	var homepage = "<a href='home.html'>Home</a>";
	var adminpage  = "<a href='admin.html'>Admin</a>";
	var schoolspage  = "<a href='schools.html'>Schools</a>";
	var classespage  = "<a href='classes.html'>Classes</a>";
	var studentspage  = "<a href='students.html'>Students</a>";
	var packagespage = "<a href='packages.html'>Packages</a>";
	
	var standard = "<a href='edit_standard_pack.html'>Standard</a>";
	var photo = "<a href='edit_photo_pack.html'>Photo</a>";
	var calendar = "<a href='edit_calendar_pack.html'>Calendar</a>";
	
	

	 document.getElementById('pageTitle').innerHTML = pTitle;
	
	 document.getElementById('mitem2').innerHTML = adminpage;
	 document.getElementById('mitem1').innerHTML = homepage;
	 document.getElementById('mitem2').innerHTML = adminpage;
	 document.getElementById('mitem3').innerHTML = schoolspage;
	 document.getElementById('mitem4').innerHTML = classespage;
	 document.getElementById('mitem5').innerHTML = studentspage;
	 document.getElementById('mitem6').innerHTML = packagespage;
	
	 document.getElementById('c1').innerHTML = standard;
	 document.getElementById('c2').innerHTML = photo;
	 document.getElementById('c3').innerHTML = calendar;
}



