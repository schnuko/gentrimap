$(document).ready(function() {
	map = drawMap();
	d3.json("http://localhost/gentrimap/html/_/js/ninetrends-latlng.geojson", function(collection) {
		
		addMapOverlay(map,collection);
		addMatrix(collection);

  	});

});


function addMatrix(collection) {
	
	var width = $("#matrix").width(), height = width/2;

	var x = d3.scale.linear()
    .range([0, width]).domain([-4, 4]);
    var y = d3.scale.linear()
    .range([0, height]).domain([4, -4]);

    var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");

	var svg = d3.select("#matrix").append("svg")
	    .attr("class", "matrix")
	    .attr("width", "100%")
	    .attr("height", height).append("g");

	svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height/2 + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Wohnen Index");

  svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + width/2 + ",0)")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("transform", "translate(-20,0)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Sozio-Demographisches Index")

circlecount = 1;
linescount = 1;

	

    var origins = svg.selectAll("circle")
    	.data(collection.features)
    	.enter().append("circle")
    				.attr("cx", function(d) { return x(d.properties.Wohnen_Ind)})
    				.attr("cy", function(d) { return y(d.properties.Sozio_Demo)})
    				.attr("r", 4)
    				.attr("data-stadtteil", function(d) { console.log(circlecount); circlecount++;  return d.properties.Stadtteil})
                    .attr("data-bezirk", function(d) { return d.properties.Bezirk});

    var trends = svg.selectAll("line")
	  	.data(collection.features)
		.enter().append("line")
					.attr("x1", function(d) { return x(d.properties.Wohnen_Ind)})                 
					.attr("y1", function(d) { return y(d.properties.Sozio_Demo)})                    
					.attr("x2", function(d) { return x(d.properties.Wohnen_I_1)})
                    .attr("y2", function(d) { return y(d.properties.Sozio_De_1)})
                    .attr("stroke-width", 2)
                    .attr("stroke", "grey")
                    .attr("data-stadtteil", function(d) { console.log(linescount); linescount++;   return d.properties.Stadtteil})
                    .attr("data-bezirk", function(d) { return d.properties.Bezirk});

	console.log(collection.features);

	$("circle").on("mouseenter", function() {
		var stadtteil = $(this).attr("data-stadtteil");
		$("#matrix-info").append("<h3>" + stadtteil + "</h3>");
		$("#matrix-info").append($(this).attr("data-bezirk"));
		$('line[data-stadtteil="'+stadtteil+'"]').attr("stroke-width", 5).attr("stroke", "#000");
		

	}).on("mouseleave", function() {
		var stadtteil = $(this).attr("data-stadtteil");
		$("#matrix-info").empty();
		$('line[data-stadtteil="'+stadtteil+'"]').attr("stroke-width", 2).attr("stroke", "grey");
	})
}


function drawMap() {
	var lat = 52.517057;
	var lng = 13.406067;
	var zoom = 11;

	var xtile = lng2tile(lng,zoom);
	var ytile = lat2tile(lat,zoom);



	var map = new L.map('map').setView([lat,lng], zoom);

	L.tileLayer('http://{s}.tile.cloudmade.com/8d3aebdf38f74388bdad35df7e604d4e/22677/256/{z}/{x}/{y}.png', {
	    key: "8d3aebdf38f74388bdad35df7e604d4e",
	    attribution: "Map data &copy; OpenStreetMap contributors, CC-BY-SA, Imagery  &copy; CloudMade",
	    styleId: 22677
	}).addTo(map);
	return map;
}


function addMapOverlay(map,collection) {
	var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");
		
	var bounds = d3.geo.bounds(collection),
	  	path = d3.geo.path().projection(project);

	var feature = g.selectAll("path")
	  	.data(collection.features)
		.enter().append("path");

	//feature.style("fill",colortrends).attr("class",setnineclass);
	feature.attr("class",setnineclass);

	map.on("viewreset", reset);

	

	reset();

	setLegendColours();

	// Reposition the SVG to cover the features.
	function reset() {
		var bottomLeft = project(bounds[0]),
		    topRight = project(bounds[1]);

		svg .attr("width", topRight[0] - bottomLeft[0])
		    .attr("height", bottomLeft[1] - topRight[1])
		    .style("margin-left", bottomLeft[0] + "px")
		    .style("margin-top", topRight[1] + "px");

		g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

		feature.attr("d", path);
		
	}
}


/* Helper Functions */

function lng2tile(lng,zoom) { return (Math.floor((lng+180)/360*Math.pow(2,zoom))); }

function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }

function project(x) {
  var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));  
  return [point.x, point.y];
}

function setLegendColours() {
	$('#colours-wrap a').each(function() {
		var $colblock = $(this);
		var classSelect = ".";
		classSelect += $colblock.parent("div").attr("class");
		classSelect += ".";
		classSelect += $colblock.attr("class");

		var $relatedPaths = $("path" + classSelect);
		var $nonrelatedPaths = $("path").not($relatedPaths);
		var theCol = $relatedPaths.css("fill");

		$colblock.css({"background" : theCol});
		$colblock.on("mouseenter", function() {
			$relatedPaths.stop(true,true).animate({"opacity":1, "stroke-width": "3px"}, "fast");
			$nonrelatedPaths.stop(true,true).animate({"opacity":.4}, "fast");
		}).on("mouseleave", function() {
			$("path").stop(true,true).animate({"opacity":.7, "stroke-width": "1.5px"}, "fast");
		});
	});
}


function setnineclass(d, i) {
	var nineclass, classSelect;
	if (d.properties.Wohnen_I_2 < 0.1) {
		nineclass = "downwohn";	
	}
	else if (d.properties.Wohnen_I_2 > 1.17) {
		nineclass = "upwohn";	
	}
	else {
		nineclass = "midwohn";
	}
	
	if (d.properties.Sozio_De_2 < 0) {
		nineclass += " downsd";	
	}
	else if (d.properties.Sozio_De_2 > 0.18) {
		nineclass += " upsd";
	}
	else {
		nineclass += " midsd";
	}
	return nineclass;
}


function colortrends(d, i) {
	/*
	red = rgba(178, 24, 43, 1);
	orange = rgba(239, 138, 98, 1);
	white = rgba(247, 247, 247,1);
	lightblue = rgba(146, 197, 222,1);
	darkblue = rgba(33, 102, 172);
	*/

	/* -.-.-.- Mel's original colours commented out -.-.-.-
	var h = 37, s = .86, l = .6;
	if (d.properties.Wohnen_I_2 < 0.1) {
		// cheap houses = red
		h = 353;
		s = .76;
		l = .4;
	}

	if (d.properties.Wohnen_I_2 > 1.17) {
		// expensive houses = blue
		h = 210;
		s = .68;
		l = .4;
	}

	if (d.properties.Sozio_De_2 < 0) {
		// poverty index
		l = l/2;
		s = s/2;
	}

	if (d.properties.Sozio_De_2 > 0.18) {
		l = l + ((1 - l)/2);
		s = s + ((1 - l)/2);	
	}

	return d3.hsl(h, s, l);
	   -.-.-.- Mel's original colours comment end -.-.-.- */



	// -.-.-.- Paul's colours -.-.-.-
	/*
	darkblue = #143ead;
	midblue = #5884d1;
	lightblue = #9dcaf6;
	darkorange = #c36d4b;
	midorange = #e0a882;
	lightorange = #fde3b9;
	darkred = #9e131a;
	midred = #cc565f;
	lightred = #fa99a4;
	*/
	var h = 37, s = .86, l = .6;
	if (d.properties.Wohnen_I_2 < 0.1) {
		// cheap houses = red
		h = 353;
		s = .76;
		l = .4;
	}

	if (d.properties.Wohnen_I_2 > 1.17) {
		// expensive houses = blue
		h = 210;
		s = .68;
		l = .4;
	}

	if (d.properties.Sozio_De_2 < 0) {
		// poverty index
		l = l/2;
		s = s/2;
	}

	if (d.properties.Sozio_De_2 > 0.18) {
		l = l + ((1 - l)/2);
		s = s + ((1 - l)/2);	
	}

	return d3.hsl(h, s, l);
}