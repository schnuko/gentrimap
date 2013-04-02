/*
ToDo:
	Deterministisch oder automatische Backups
*/

/*
Questions:
colour processing
if x !== undefined
why don't we preprocess the tablelist? or will we in production?
integrating with openstreetmap data?
how does geojson work - are they lat long? how are they mapped to canvas?
canvas areas on hover/click - do you need to just check for mouse position?
colours against the average value rather than absolute?
ability to zoon
show data per bezirke
less difference between colours
how to show multiple indices together - e.g. rent prices vs share of 25-25 year olds
*/


var width = 700;
var height = 600;
var aspectRatio = 0.62;

var xMin = 13.05;
var xMax = 13.80;
var yMin = 52.3;
var yMax = 52.7;

var sliderMousePressed = false;

var zoom = Math.min(width/(xMax-xMin)/aspectRatio, height/(yMax-yMin));

var
	canvas,
	context,
	regions,
	selectedTable,
	selectedYear = -1,
	minYear =  1e10,
	maxYear = -1e10,
	tableList = [],
	slider;
	
var frame = 0;

$(function () {

	// set up the canvas, disallow normal clicks
	canvas = $('#canvas');
	canvas.attr('width',  width );
	canvas.attr('height', height);
	canvas = canvas.get(0);
	context = canvas.getContext('2d');
	
	$('body').click(function () {
		abort = true;
	})
	// set up the data, buttons and event listeners
	init();
	// select the first dataset (Table) and call the redraw() function to display the map
	start();
});


function init() {
	regions = [];

	// where does this data object come from?
	// data.geo = Array[1] => 1 object => properties: 
		//data = array of 447 objects with geo coordinates (polygons) and Schluessel
		//index = links schluessel values to index
		//options = geoname, synonyms
	// data.data = Array of 118 objects with properties:
		// data = Array of ~445 objects with geoID (schluessel?), geoindex (index?), value 
		// options = geoName (which geo dataset), minValue, maxValue, tableName (which dataset e.g. fertility), year

	var geo = data.geo[0].data;

	console.log(data);
	for (var i = 0; i < geo.length; i++) {
		regions.push(geo[i].geometry.coordinates);
	}
	
	// Initialisiere Datensätze
	tableList = [];
	var obj = {};

	// this value stores how many data sets we have, e.g. fertility, arbeitslos
	var tableListIndex = -1;

	// loop through all our data
	for (var i = 0; i < data.data.length; i++) {

		//get the name of the data set this chunk relates to (e.g. fertility)
		var name = data.data[i].options.tableName;
		// what year are we dealing with?
		var year = data.data[i].options.year;
		// If we haven't seen this name before
		if (obj[name] === undefined) {
			//increment the number of datasets
			tableListIndex++;
			// add the relevant details to the table list ( ann array of objects, each stores name, min and max value, min and max year and map of year to data chunks. The data chunk contain the values for each region. Each region has an id which is crossreferenced to the geodata)
			tableList[tableListIndex] = {
				tableName: name,
				years: [],
				// set very high and low numbers so we can refine these with our actual data
				minYear:  1e10,
				maxYear: -1e10,
				minValue: 1e10,
				maxValue: -1e10
			}
			// add a defnition for the name so we won't repeat when we find the next year for this dataset
			// set it to be the index of the data set we are working with
			obj[name] = tableListIndex;
		}
		var tl = tableList[obj[name]]; //obj[name] is index of dataset (e.g. fertility)
		tl.years[year] = i; // e.g. fertility.1992 = 234 (the index of the data chunk we are looking at now) this let's us look up the relevant data chunk later when we change the year
		// adjust min and or max years as appropriate
		if (tl.minYear > year) tl.minYear = year;
		if (tl.maxYear < year) tl.maxYear = year;
		
		var d = data.data[i].data; // this represent one data set in one year
		for (var j = 0; j < d.length; j++) { // loop through all the regions
			var v = d[j].value;
			if (tl.minValue > v) tl.minValue = v; // update min and max values
			if (tl.maxValue < v) tl.maxValue = v;
		}
		
		// What's happening here?
		if (data.data[i].options.minValue !== undefined) tl.minValue = data.data[i].options.minValue;
		if (data.data[i].options.maxValue !== undefined) tl.maxValue = data.data[i].options.maxValue; 
	}
	
	for (var i = 0; i < tableList.length; i++) {
		var t = tableList[i];
		
		if (minYear > t.minYear) minYear = t.minYear;
		if (maxYear < t.maxYear) maxYear = t.maxYear;
		
		// set up the buttons
		t.node = $('<p class="button">'+t.tableName+'</p>');
		$('#datasets').append(t.node);
		t.node.click((function () {
			var id = i;
			return function () {
				selectTable(id);
			}
		})());
	}
	
	$(document).mouseup(function () { sliderMousePressed = false })
	
	// set up jQuery UI slider and tell it to update and display the selected year when changed
	slider = $('#slider-element').slider({
		min: minYear,
		max: maxYear,
		slide: function( event, ui ) {
			$("#slider-selection").html(ui.value);
			selectYear(ui.value);
		},
		change: function( event, ui ) {
			$("#slider-selection").html(ui.value);
		}
	});
		
}


function start() {
	selectTable(0);
	//selectYear(0);
}

function selectYear(year) {

	// update the year, check it's within allowed range, redraw
	if (year == selectedYear) return;
	
	selectedYear = year;
	if (selectedYear < tableList[selectedTable].minYear) selectedYear = tableList[selectedTable].minYear;
	if (selectedYear > tableList[selectedTable].maxYear) selectedYear = tableList[selectedTable].maxYear;
	
	slider.slider('value', selectedYear);
	
	redraw();
}

function selectTable(id) {

	// remove and add "selected" class for css styling
	for (var i = 0; i < tableList.length; i++) tableList[i].node.removeClass('selected');
	tableList[id].node.addClass('selected');

	// update selectedTable to be used by redraw function
	selectedTable = id;
	
	// Different data sets span different periods. Check the currently selected year is not outside the range for the new data set 
	var year = selectedYear;
	if (year < tableList[selectedTable].minYear) year = tableList[selectedTable].minYear;
	if (year > tableList[selectedTable].maxYear) year = tableList[selectedTable].maxYear;
	selectYear(year);
	
	// Update the min and max values for the slider
	slider.slider("option", {
		min: tableList[selectedTable].minYear,
		max: tableList[selectedTable].maxYear,
		value: year
	});

	//refresh the map with new data set
	redraw();
}

function p2(x) {
	return x*x;
}
function redraw() {

	console.log(tableList[selectedTable]);

	// identify which data set, then use the year to look up the id of the relevant data chunk
	id = tableList[selectedTable].years[selectedYear];
	if (id === undefined) return;
	
	// get the min and max value to use to scale all values between 0 and 1
	var minValue = tableList[selectedTable].minValue;
	var maxValue = tableList[selectedTable].maxValue;
	
	/*
	var colors = [
		[0.0, 0.0, 1.0],
		[0.9, 0.9, 0.9],
		[1.0, 0.0, 0.0]
	];*/
	
	
	var colors = [
		[0.26, 0.41, 0.70], // red
		[0.81, 0.82, 0.83], // green
		[0.92, 0.10, 0.23] // blue
	];

	// why are we setting colours if they are not undefined??
	if (tableList[selectedTable].colors !== undefined) colors = tableList[selectedTable].colors;
	
	// draw the background
	context.fillStyle = '#F7F7F7';
	context.fillRect(0, 0, width, height);
	
	// use the id from the year to grab only the data chunk we want
	var d = data.data[id].data;
	// console.log(d);
	
	// loop through the datachunk to grab the value and geocoordinates for each region
	for (var i = 0; i < d.length; i++) {
		var obj = d[i];
		// grab the geocoordinates
		var region = regions[obj.geoIndex];
		
		var value = obj.value;
		
		//Place value in range from 0 to 1
		value = (value-minValue)/(maxValue-minValue); 
		
		// Keep values within 0 to 1
		if (value > 1) value = 1;
		if (value < 0) value = 0;
		
		value = value*(colors.length-1);
		
		var colorIndex = Math.floor(value);
		if (colorIndex >= (colors.length-1)) colorIndex = (colors.length-2);
		
		value = value - colorIndex;
		if (value > 1) value = 1;
		if (value < 0) value = 0;
		
		// set RGB based on processed value
		var cr = (1-value)*colors[colorIndex][0] + value*colors[colorIndex+1][0];
		var cg = (1-value)*colors[colorIndex][1] + value*colors[colorIndex+1][1];
		var cb = (1-value)*colors[colorIndex][2] + value*colors[colorIndex+1][2];
		
		context.fillStyle = 'rgb('+ Math.round(255*cr)+','+ Math.round(255*cg)+','+ Math.round(255*cb)+')';
		
		cr = Math.round(cr*240);
		cg = Math.round(cg*240);
		cb = Math.round(cb*240);
		
		context.strokeStyle = 'rgb('+cr+','+cg+','+cb+')';
		
		for (var j = 0; j < region.length; j++) {
			context.beginPath();
			var r = region[j];

			// need to have a think about how the geo translates to x and y coordinates
			for (var k = 0; k < r.length; k++) {
				var x = aspectRatio*zoom*(r[k][0] - (xMax+xMin)/2) + width/2;
				var y =            -zoom*(r[k][1] - (yMax+yMin)/2) + height/2;
				if (k == 0) {
					context.moveTo(x, y);
				} else {
					context.lineTo(x, y);
				}
			}
			context.closePath();
			context.fill();
			context.stroke();
		}
	}
}
