/* 
*
* 	Our Program: GentriMap
*	
*	GentriMap.active records which vis we are looking at right now
*	Gentrimap.intro, Gentrimap.trendsMap, GentriMap.trendsMatrix and GentriMap.inital are the three parts of the program that control
*	the data visualisations.
*	Each has an init() function to get it started, a destroy() function, 
*	some draw methods and methods to set different event listeners for interaction
*
*/

var GentriMap = {
	active : 'trendsMap'
};



jQuery(document).ready( function($) {

	/*
	*
	*	Start map visualisation
	*
	*/

	GentriMap.trendsMap = function() {

		// find the div to insert the map
		var $mapbox = $('#trend-karte'),
		$map = $('#trendmap'),
		initComplete = false,
		trends = {},
		features,
		map,
		bounds,
		path,
		svg,
		g;

		return {

			init : function init() {

				GentriMap.active = 'trendsMap';

				// set up the map by making it visible, dynamically setting the size 
				$mapbox.removeClass("invisible");
				$map.height($(window).height()-250 > 500 ? $(window).height()-250 : 500);

				// call drawMap to draw the leaflet base tiles (shows streets etc as background layer)
				map = drawMap('trendmap');

				// Import the geodata and trend data files. 
				// Info on creating topojson files here: http://bost.ocks.org/mike/map/
				// to use this code virtually unchanged, set the start of your topojson file to {"type":"Topology","objects":{"immoscout":
				// queue function waits until files are fully loaded then calls ready()
				queue()
				    .defer(d3.json, "_/data/geo/immoscout.topojson")
				    // on import of trends_analysis, add each row of data (d) to the trends array. 
				    // d.StadtID is the key that links the data to the immoscout geo "features" (polygons)
				    .defer(d3.csv, "_/data/trends/trends_analysis.csv", function(d) { trends[d.StadtTID] = d; })
				    .await(ready);

				function ready(error, collection) {

					//map our imported data from immoscout.topojson to our dataset variable
					dataset=collection;

					// add an svg vector graphic with a group element (g) as overlay to the map, ready to draw the colour coded disticts into g
					svg = d3.select(map.getPanes().overlayPane).append("svg");
			    	g = svg.append("g").attr("class", "leaflet-zoom-hide");

			    	// set the geographic boundaries of our data, set the map projection so d3 can draw shapes to match the underlying leaflet map
			    	bounds = d3.geo.bounds(topojson.feature(collection, collection.objects.immoscout));
			    	path = d3.geo.path().projection(project);

			    	// bind data from immoscout.topojson
			    	// first select the g element, look for any paths with class "trend-area" and select them (at the moment there are none)
			    	features = g.selectAll("path.trend-area")
			    		// select the topojson polygons to be the data
						.data(topojson.feature(collection, collection.objects.immoscout).features)
						// for each polygon, bind the polygon data to a new path and add it to the g element
						.enter().append("path")
						// set the path class to be one of the 9-er typology (determines colour)
						.attr("class",setnineclass);

					// set up event listeners for hover and click on colour key/legend
					setLegendListeners();
					// set up event listeners for hover on city districts
					setTooltipListeners();
					// bind reset event to map zoon
					map.on("viewreset", reset);
					// reset the map to display everything
					reset();

					initComplete = true;
				}

			},

			destroy : function destroy() {
				if (initComplete) {
					// unset event listeners, destroy map and hide map div
					map.off("viewreset", reset);
					map.remove();
					$map.empty();
					$mapbox.addClass("invisible");
					d3.selectAll('.colours a').on('mouseenter',null).on('mouseleave', null).on('click',null);
					d3.selectAll("path").on("mouseenter",null).on("mouseleave",null);
					
				} else {
					setTimeout(destroy, 500);
				}
				
			}
		}

		// Position the SVG to cover the map in the right place. Reposition on zoom or drag
		function reset() {
			var bottomLeft = project(bounds[0], map),
			    topRight = project(bounds[1], map);

			svg .attr("width", topRight[0] - bottomLeft[0])
			    .attr("height", bottomLeft[1] - topRight[1])
			    .style("margin-left", bottomLeft[0] + "px")
			    .style("margin-top", topRight[1] + "px");

			g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

			features.attr("d", path);
			
		}

		// Set the class of each city district area to reflect the trends analysis data
		// each path is passed in turn. "d" is the single polygon/geo data that is bound to the path
		// d.id lets us access the relevant entry in the trends[] array, where all the city district data like
		// trend information or poverty rates is stored
		// the class colours are then set with CSS

		function setnineclass(d, i) {

		if (trends[d.id] == undefined) {
				return "null";
			}
			else {
				var nineclass = "";
				if(trends[d.id].Wohn_Change < 0 && trends[d.id].Wohn_Change > parseFloat(trends[d.id].Wohn_Boarder)) {
					nineclass = "downwohn";	
				}
				else if (trends[d.id].Wohn_Change < 1 && trends[d.id].Wohn_Change > parseFloat(trends[d.id].Wohn_Boarder)) {
					nineclass = "midwohn";
				}
				else if (trends[d.id].Wohn_Change >= 1) {
					nineclass = "upwohn";
				}
				else {
					nineclass += "notwohn notsd"
				}
				if (trends[d.id].SozD_Change < 0 && trends[d.id].SozD_Change > parseFloat(trends[d.id].Soz_Boarder)) {
					nineclass += " downsd";	
				}
				else if (trends[d.id].SozD_Change < 1 && trends[d.id].SozD_Change > parseFloat(trends[d.id].Soz_Boarder)) {
					nineclass += " midsd";	
				}
				else if (trends[d.id].SozD_Change >= 1) {
					nineclass += " upsd";	
				}
				else {
					nineclass += " notsd notwohn"
				}

				return nineclass + " trend-area";
			}

		}

		// Helper function for map projections

		function project(x) {
			var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));  
			return [point.x, point.y];
		}

		// these functions toggle highlighting on and off for matching city districts (e.g. upwohn, downsd)
		// when the colour key/legend is hovered or clicked on
		// emphasis = stronger colour, deemphasis = less colour, set this in CSS

		function setLegendListeners() {
			d3.selectAll('.colours a').on('mouseenter', function() {
				var theSquare = d3.select(this);
				if(!theSquare.classed("active")) {
					var theClasses = d3.select(this).attr('class');
					var relatedAreas = d3.selectAll('path').filter(function() {
						return d3.select(this).classed(theClasses);
					});
					var nonrelatedAreas = d3.selectAll('path').filter(function() {
						return !d3.select(this).classed(theClasses) && !d3.select(this).classed("emphasis");
					});

					relatedAreas.classed("emphasis", true).classed("deemphasis", false);
					nonrelatedAreas.classed("deemphasis", true).classed("emphasis", false);
				}
			}).on('mouseleave', function() {
				var theSquare = d3.select(this);
				var theClasses = theSquare.attr('class'); 
				var nonrelatedAreas = d3.selectAll('path').filter(function() {
					return !d3.select(this).classed(theClasses) && !d3.select(this).classed("active");
				});
				var relatedAreas = d3.selectAll('path').filter(function() {
					return d3.select(this).classed(theClasses);
				});
				var theAreas = d3.selectAll('path');
				if(!theSquare.classed("active")) {
					relatedAreas.classed("emphasis", false);
					if (nonrelatedAreas.size() == theAreas.size() - relatedAreas.size()) {
						nonrelatedAreas.classed("deemphasis", false);

					} else {
						relatedAreas.classed("deemphasis", true);
					}
					
				}
					
			}).on('click',function(e) {
				d3.event.preventDefault();
				var theSquare = d3.select(this);
				var theClasses = d3.select(this).attr('class');
				var theAreas = d3.selectAll('path');
				var relatedAreas = d3.selectAll('path').filter(function() {
					return d3.select(this).classed(theClasses);
				});
				var nonrelatedAreas = d3.selectAll('path').filter(function() {
					return !d3.select(this).classed(theClasses) && !d3.select(this).classed("active");
				});
				var typDescription = d3.select('.typ-description');
				var allTypDescriptions = d3.selectAll('.typ-description div');
				var thisTypDescription = d3.selectAll('.typ-description div').filter(function() {
					return d3.select(this).classed(theClasses);
				});
				if (!theSquare.classed("active")) {
					relatedAreas.classed("emphasis active", true).classed("deemphasis", false);
					nonrelatedAreas.classed("deemphasis", true).classed("emphasis", false);
					theSquare.classed("active", true);
					typDescription.classed("invisible",false);
					allTypDescriptions.classed("invisible", true);
					
					if (nonrelatedAreas.size() == theAreas.size() - relatedAreas.size()) {
						thisTypDescription.classed("invisible",false);
					}

				} else {
					relatedAreas.classed("active", false);
					theSquare.classed("active", false);	
					if (nonrelatedAreas.size() != theAreas.size() - relatedAreas.size()) {
						relatedAreas.classed("deemphasis", true).classed("emphasis",false);
					}
					typDescription.classed("invisible",true);
					allTypDescriptions.classed("invisible", true);				
				}
				
			})

		}

		// Add a tooltip on hover over the city districts. If you change the names of colums in the trends_analysis.csv file,
		// you can show different data here, e.g. percentage of altbau, or number of new developments

		function setTooltipListeners() {
			d3.selectAll("path.trend-area").filter(function(d) {return !d3.select(this).classed("null");}).tooltip(function(d, i) {
				var content = '<div><p>';
				content += '<strong>Income Poverty:</strong> ' +  (trends[d.id].Einkommen_Arm*100).toFixed(2) + '% &rarr; ' + (trends[d.id].Einkommen_Arm_t2*100).toFixed(2) +'%<br/>';
				//content += '<strong>Erwachsenen Armut:</strong> ' +  (trends[d.id].Erwa_Arm*100).toFixed(2) + '%<br/>';
				//content += '<strong>Altersarmut:</strong> ' +  (trends[d.id].Alter_Arm*100).toFixed(2) + '%';
				content += '<hr/>';
				content += '<strong>Rent Price:</strong> ' +  (trends[d.id].Mietpreise*1).toFixed(2) + '€ &rarr; ' + (trends[d.id].Mietpreise_t2*1).toFixed(2) +'€<br/>';
				content += '<strong>Condominiums:</strong> ' +  (trends[d.id].Anteil_ETW*100).toFixed(2) + '% &rarr; ' + (trends[d.id].Anteil_ETW_t2*100).toFixed(2) +'%<br/>';
				content += '<strong>Affordable Flats:</strong> ' +  (trends[d.id].Anteil_KDU*100).toFixed(2) + '% &rarr; ' + (trends[d.id].Anteil_KDU_t2*100).toFixed(2) +'%<br/>';
				content += '</p></div>';
				return {
					type: "popover",
					title: '<strong style="font-size:1.5em;">' + trends[d.id].Stadtteil + '</strong><br/>' + trends[d.id].Bezirk,
					content: content,
					detection: "shape",
					placement: "mouse",
					gravity: 'up',
					position: path.centroid(_.where(topojson.feature(dataset, dataset.objects.immoscout).features, {id: d.id})[0]),
					displacement: [10, 10],
					mousemove: false,
			    };
			});
		}

	}();
	
	

	/*
	*
	*	Start second visualisation
	*
	*/

	GentriMap.trendsMatrix = boxplot("Change");

	/*
	*
	*	Start third visualisation
	*
	*/

	GentriMap.initial = boxplot("07");

	/*
	*
	*	Start fourth visualisation
	*
	*/

	GentriMap.intro = {
		init: function () {
			var $intro = $('#intro');

			GentriMap.active = 'intro';
			$intro.removeClass('invisible');

		},
		destroy : function() {
			var $intro = $('#intro');
			
			$intro.addClass("invisible");			
		}
		
	}


	/*
	*
	* Map Helper Functions
	*
	*/

	// scale latitude and longitude for map
	function lng2tile(lng,zoom) { return (Math.floor((lng+180)/360*Math.pow(2,zoom))); }

	function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }

	function drawMap(mapdiv) {
		var lat = 48.143642; //48.133032416231991;
		var lng = 11.570118; //11.649270930839434;
		var zoom =11;
		if($(window).height() < 850) zoom = 11;

		var xtile = lng2tile(lng,zoom);
		var ytile = lat2tile(lat,zoom);

		var map = new L.map(mapdiv).setView([lat,lng], zoom);

		//L.tileLayer('http://{s}.tile.cloudmade.com/8d3aebdf38f74388bdad35df7e604d4e/22677/256/{z}/{x}/{y}.png', {
		//L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {
		//L.tileLayer('http://a.tiles.mapbox.com/v3/examples.map-zr0njcqy/{z}/{x}/{y}.png', {
		L.tileLayer('http://a.tiles.mapbox.com/v3/examples.map-20v6611k/{z}/{x}/{y}.png', {
		//L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		//L.tileLayer("http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg", {
			 	//key: "8d3aebdf38f74388bdad35df7e604d4e",
		    attribution: "Map data &copy; OpenStreetMap contributors, CC-BY-SA, Imagery  &copy; Mapbox",
		    //styleId: 22677
		}).addTo(map);
		return map;
	}


	/* Helper function to return length/size of d3 selection, similar to jQuery .length() */
	d3.selection.prototype.size = function() {
		var n = 0;
		this.each(function() { ++n; });
		return n;
	};

	/* 
	*
	* 	Start the program 
	*
	*/

	GentriMap.trendsMap.init();

	/* 
	*
	* 	Add listeners to the buttons at the top of the screen. These switch between the 3 different types of visualisation.
	*
	*/

	$('#introLink').on('click',function(e) {
		e.preventDefault();
		if (GentriMap.active==='intro') return;
		GentriMap[GentriMap.active].destroy();
		$('.vis-navigation span').removeClass("active");
		$(this).parent('span').addClass('active');
		GentriMap.intro.init();
	});

	$('#trendMapLink').on('click',function(e) {
		e.preventDefault();
		if (GentriMap.active==='trendsMap') return;
		GentriMap[GentriMap.active].destroy();
		$('.vis-navigation span').removeClass("active");
		$(this).parent('span').addClass('active');
		GentriMap.trendsMap.init();
	});

	$('#trendMatrixLink').on('click',function(e) {
		e.preventDefault();
		if (GentriMap.active==='trendsMatrix') return;
		GentriMap[GentriMap.active].destroy();
		$('.vis-navigation span').removeClass("active");
		$(this).parent('span').addClass('active');
		GentriMap.trendsMatrix.init();
	});

	$('#initialLink').on('click',function(e) {
		e.preventDefault();
		if (GentriMap.active==='initial') return;
		GentriMap[GentriMap.active].destroy();
		$('.vis-navigation span').removeClass("active");
		$(this).parent('span').addClass('active');
		GentriMap.initial.init();
	});

});

function boxplot(value) {

		// find the trend matrix div
		var $matrixbox = $('#trend-matrix'),
		$matrix = $('#matrix'),
		trends;

		return {
			init : function() {
				
				// prepare the div by making it visible, dynamically setting the div height to match the screen
				var activeTab = (value == "Change") ? 'trendsMatrix' : 'initial';
				GentriMap.active = activeTab;
				$matrixbox.removeClass("invisible");
				$matrix.height($(window).height()-250 > 500 ? $(window).height()-250 : 500);


				var svgWidth = $matrix.height() > $matrix.width() ? $matrix.width() : $matrix.height();
				var width = svgWidth - 40;

				// Define the x and y axes - linear (i.e. not logarithmic etc), min: -4, max: +4
				// this lets d3 take care of mapping our data from values to pixels on the screen
				var x = d3.scale.linear()
				    .range([0, width]).domain([-4, 4]);
			    var y = d3.scale.linear()
				    .range([0, width]).domain([4, -4]);

			    var xAxis = d3.svg.axis()
				    .scale(x)
				    .orient("bottom");

				var yAxis = d3.svg.axis()
				    .scale(y)
				    .orient("left");

				// Add the svg vector image to the matrix div and set dimensions
				var svg = d3.select("#matrix").append("svg")
				    .attr("class", "matrix")
				    .attr("width", svgWidth)
				    .attr("height", svgWidth)
				// add g element ready to insert cartesian graph
			    .append("g")
			    	.attr("transform", "translate(" + 20 + "," + 20 + ")");

			    // read in the data from the csv file
			   	d3.csv("_/data/trends/trends_analysis.csv", function(collection) {

			   		// map data to variable trends
			   		trends = collection;

		   		// add x and y axes and their labels
		   		svg.append("g")
				      .attr("class", "x axis")
				      .attr("transform", "translate(0," + x(0) + ")")
				      .call(xAxis)
				 				.append("text")
					  			.attr("class", "label")
					  			.attr("x", width)
				      		.attr("y", -6)
									.style("text-anchor", "end")
									.text("Sozio-Demographic Index");


					svg.append("g")
						  .attr("class", "y axis")
						  .attr("transform", "translate(" + (width * 1/2) + ",0)")
						  .call(yAxis)
						  	.append("text")
							    .attr("class", "label")
							    .attr("transform", "translate(-20,0)")
							    .attr("y", 6)
							    .attr("dy", ".71em")
							    .style("text-anchor", "end")
							    .text("Residential-Economic Index");
							    
							  
					if(value == "Change") {
					
						// add the boundary lines for above-average upgrading		
											
						svg.append("line")
								.attr("x1", x(1))
								.attr("y1", y(4))
								.attr("x2", x(1))
								.attr("y2", y(1)-1.5)
								.attr("stroke-width", 3)
								.attr("stroke", "#9e131a")
							
						svg.append("line")
								.attr("x1", x(4))
								.attr("y1", y(1))
								.attr("x2", x(1)-1.5)
								.attr("y2", y(1))
								.attr("stroke-width", 3)
								.attr("stroke", "#9e131a")
							
						// add the boundary lines for below-average upgrading			
							
						svg.append("line")
								.attr("x1", x(0))
								.attr("y1", y(4))
								.attr("x2", x(0))
								.attr("y2", y(0)-1.5)
								.attr("stroke-width", 3)
								.attr("stroke", "#c36d4b")
							
						svg.append("line")
								.attr("x1", x(4))
								.attr("y1", y(0))
								.attr("x2", x(0)-1.5)
								.attr("y2", y(0))
								.attr("stroke-width", 3)
								.attr("stroke", "#c36d4b")		
							
						// add the boundary lines for actual upgrading								
							
						svg.append("line")
								.attr("x1", x(collection[1].Soz_Boarder))
								.attr("y1", y(3.6)	)
								.attr("x2", x(collection[1].Soz_Boarder))
								.attr("y2", y(collection[1].Wohn_Boarder)-1.5)
								.attr("stroke-width", 3)
								.attr("stroke", "#143ead")
							
						svg.append("line")
								.attr("x1", x(4))
								.attr("y1", y(collection[1].Wohn_Boarder))
								.attr("x2", x(collection[1].Soz_Boarder)-1.5)
								.attr("y2", y(collection[1].Wohn_Boarder))
								.attr("stroke-width", 3)
								.attr("stroke", "#143ead")

					}
							

					// add the points
			    
			    var trends = svg.selectAll("circle.trend-arrow")
				  	.data(collection)
					.enter().append("circle")
								.attr("class", function(d) { return setnineclass(d) + " " + d.Stadtteil})
								.attr("cx", function(d) { return x(d["SozD_" + value])})                 
								.attr("cy", function(d) { return y(d["Wohn_" + value])})                    
								.attr("r", "5")
			                    //.attr("stroke-width", 1)
			                    //.attr("stroke", "grey")
			                    
			                    
			    svg.selectAll('select.matrix-filter')

			    
			    // add the names and IDs of all the city districts to the select drop down menu
			    var select = d3.selectAll('select.matrix-filter');

			    select.append("option").attr("value","all").text("All Neighbourhoods");

			    select.selectAll("option.stadtteil")
			    	.data(collection)
			    	.enter().append("option")
			    		.attr("value", function(d) { return d.Stadtteil} ).text(function(d) {return d.Stadtteil} );

			    setCircleInfo();
			    setLegendListeners();
			    setSelectListener();

		   	});

				
			},

			// remove the matrix and all event listeners and all options in select box
			destroy : function() {
				
				d3.selectAll('option').remove();
				d3.select("#matrix svg").remove();
				$matrixbox.addClass("invisible");
				d3.selectAll('circle').on('mouseenter',null).on('mouseleave',null);
				d3.selectAll('.colours a').on('mouseenter',null).on('mouseleave',null).on('click',null);
				$('#matrix-info').empty();
			}
		}

		
		function createInfoContent(d){
		
			var infoContent = '<h3>' + d.Stadtteil + '</h3><h4>' + d.Bezirk + '</h4>';
			infoContent += '<strong>Sozio-Demographic Index</strong>';
			if (parseFloat(d["SozD_" + value]) > 0) {
				infoContent += '<p class="index-trend positive">+' + parseFloat(d["SozD_" + value]).toFixed(2) + '</p>';
			} else {
				infoContent += '<p class="index-trend negative">' + parseFloat(d["SozD_" + value]).toFixed(2) + '</p>';
			}
			if (parseFloat(d["Wohn_" + value]) > 0) {
				infoContent += '<strong>Residential-Economic Index</strong><p class="index-trend positive">+' + parseFloat(d["Wohn_" + value]).toFixed(2) + '</p>';
			} else {
				infoContent += '<strong>Residential-Economic Index</strong><p class="index-trend negative">' + parseFloat(d["Wohn_" + value]).toFixed(2) + '</p>';
			}
				
			return infoContent;
			
		}		
			
							
		// Set listener for hovering on the arrows. This selects the info 
		// that should be displayed in the box on the right, like the 
		// district name and the amount of change

		function setCircleInfo() {
			
			d3.selectAll('circle').on('mouseenter',function(d) {

				if(d3.select(this).classed('deemphasis')) {
					// deemphasis is no longer used
				}

				d3.select(this).classed('emphasis', true)

				var infoContent = createInfoContent(d);
				
				$('#matrix-info').html(infoContent);

			})
			
			.on('mouseleave', function(d) {
				var theCircle = d3.select(this);
				theCircle.classed('emphasis', false);
				$('#matrix-info').empty();
			});
			
		}

		// Set listeners for the colour key/legend - emphasis/highlight the arrows that belong to the matching 9-er class

		function setLegendListeners() {

			d3.selectAll('.colours a').on('mouseenter', function() {
				var theSquare = d3.select(this);
				if(!theSquare.classed("active")) {
					var theClasses = d3.select(this).attr('class');
					var relatedAreas = d3.selectAll('circle').filter(function() {
						return d3.select(this).classed(theClasses);
					});
					var nonrelatedAreas = d3.selectAll('circle').filter(function() {
						return !d3.select(this).classed(theClasses) && !d3.select(this).classed("emphasis");
					});

					relatedAreas.classed("emphasis", true);
					nonrelatedAreas.classed("emphasis", false)
				}
			}).on('mouseleave', function() {
				var theSquare = d3.select(this);
				var theClasses = theSquare.attr('class'); 
				var nonrelatedAreas = d3.selectAll('circle').filter(function() {
					return !d3.select(this).classed(theClasses) && !d3.select(this).classed("active");
				});
				var relatedAreas = d3.selectAll('circle').filter(function() {
					return d3.select(this).classed(theClasses);
				});
				var theAreas = d3.selectAll('circle');
				
				relatedAreas.classed("emphasis", false);

					
			}).on('click',function(e) {
				d3.event.preventDefault();
				 $('select.matrix-filter').prop("selectedIndex",0);
				 $('#matrix-info').empty();
				var theSquare = d3.select(this);
				var theClasses = d3.select(this).attr('class');
				var theAreas = d3.selectAll('circle');
				var relatedAreas = d3.selectAll('circle').filter(function() {
					return d3.select(this).classed(theClasses);
				});
				var nonrelatedAreas = d3.selectAll('circle').filter(function() {
					return !d3.select(this).classed(theClasses) && !d3.select(this).classed("active");
				});
				
				if (!theSquare.classed("active")) {
					relatedAreas.classed("superemphasis active", true);
					nonrelatedAreas.classed("superemphasis", false);
					theSquare.classed("active", true);

				} else {
					relatedAreas.classed("active", false);
					theSquare.classed("active", false);	
					relatedAreas.classed("superemphasis",false);		
				}
				
			})

		}

		// Listener for select/drop down menu. Highlight (emphasis) only the selected city district

		function setSelectListener() {
			var select = d3.selectAll('select.matrix-filter').on("change",function(d) {
			
				d3.selectAll('.colours a').classed("active",false);
				d3.selectAll("circle").classed("active",false).classed("superemphasis",false);
				var stadtteil = this.options[this.selectedIndex].value;
				if (stadtteil == "all") {
					d3.selectAll('circle').classed("superemphasis",false);
					$('#matrix-info').empty();
				} else {
					d3.selectAll('circle').classed("superemphasis",false);
					d3.selectAll('circle.' + stadtteil).classed("superemphasis",true);
					
					var d = this.options[this.selectedIndex].__data__;
					var infoContent = createInfoContent(d);
					$('#matrix-info').html(infoContent);
					
				}
				
			});
		}

		// This is the same as the previous setnineclass, but I had problems with scope so had to repeat it. Remember to update both functions
		// if you use different break points for your data

		function setnineclass(d, i) {
			
			var nineclass = "";
			if(d.Wohn_Change < -0 && d.Wohn_Change > parseFloat(d.Wohn_Boarder)) {
				nineclass = "downwohn";	
			}
			else if (d.Wohn_Change < 1 && d.Wohn_Change > parseFloat(d.Wohn_Boarder)) {
				nineclass = "midwohn";
			}
			else if (d.Wohn_Change >= 1) {
				nineclass = "upwohn";
			}
			else {
				nineclass += "notwohn notsd"
			}
			if (d.SozD_Change < -0 && d.SozD_Change > parseFloat(d.Soz_Boarder)) {
				nineclass += " downsd";	
			}
			else if (d.SozD_Change < 1 && d.SozD_Change > parseFloat(d.Soz_Boarder)) {
				nineclass += " midsd";	
			}
			else if (d.SozD_Change >= 1) {
				nineclass += " upsd";	
			}
			else {
				nineclass += " notsd notwohn"
			}

			return nineclass + " trend-arrow";
		
		}
	};
	
