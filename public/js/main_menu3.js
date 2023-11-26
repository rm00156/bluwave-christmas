// JavaScript Document


function menuItems() {
	
	var homepage = "<a href='home.html'>Home</a>";
	var adminpage  = "<a href='home.html'>Admin</a>";
	var schoolspage  = "<a href='schools.html'>Schools</a>";
	var classespage  = "<a href='classes.html'>Classes</a>";
	var studentspage  = "<a href='students.html'>Students</a>";
	var packages = "<a href='packages.html'>Packages</a>";

	 document.getElementById('home').innerHTML=homepage;
	 document.getElementById('admin').innerHTML=adminpage;
	 document.getElementById('schools').innerHTML=schoolspage;
	 document.getElementById('classes').innerHTML=classespage;
	 document.getElementById('students').innerHTML=studentspage;
	 document.getElementById('packages').innerHTML=packagespage;
}


