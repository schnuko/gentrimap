/* 
*
* 	Our Program: GentriMap
*	
*	GentriMap.active records which vis we are looking at right now
*	Gentrimap.trendsMap, GentriMap.trendsMatrix and GentriMap.wanderung are the three parts of the program that control
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
	*	Start first visualisation
	*
	*/

	GentriMap.trendsMap = function() {

		// find the div to insert the map
		var $mapbox = $('#trend-karte'),
		$map = $('#trendmap'),
		initComplete = false,
		trends = {},
		map,
		bounds,
		path,
		svg,
		g,
		features;

		return {
			init : function init() {

				GentriMap.active = 'trendsMap';

				// set up the map by making it visible, dynamically setting the size and calling drawMap to draw the leaflet base tiles (shows streets etc as background layer)
				$mapbox.removeClass("invisible");
				$map.height($(window).height()-250 > 500 ? $(window).height()-250 : 500);
				map = drawMap('trendmap');

				// import the geodata and trend data files. Info on creating topojson files here: http://bost.ocks.org/mike/map/
				// to use this code virtually unchanged, set the start of your topojson file to {"type":"Topology","objects":{"immoscout":
				// queue function waits until files are fully loaded then calls ready()
				queue()
				    .defer(d3.json, "_/data/trends/immoscout.topojson")
				    // on import of trends_analysis, add each row of data (d) to the trends array. d.StadtID is the key that links the data to the immoscout geo "features" (polygons)
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
				if (trends[d.id].SozD_Change < 0 && trends[d.id].SozD_Change > parseFloat(trends[d.id].Soz_Boarder)) {
					nineclass += " downsd";	
				}
				else if (trends[d.id].SozD_Change < 1 && trends[d.id].SozD_Change > parseFloat(trends[d.id].Soz_Boarder)) {
					nineclass += " midsd";	
				}
				else if (trends[d.id].SozD_Change >= 1) {
					nineclass += " upsd";	
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
				content += '<strong>Kinderarmut:</strong> ' +  (trends[d.id].Kind_Arm*100).toFixed(2) + '%<br/>';
				content += '<strong>Erwachsenen Armut:</strong> ' +  (trends[d.id].Erwa_Arm*100).toFixed(2) + '%<br/>';
				content += '<strong>Altersarmut:</strong> ' +  (trends[d.id].Alter_Arm*100).toFixed(2) + '%';
				content += '<hr/>';
				content += '<strong>Mietpreise:</strong> ' +  (trends[d.id].Mietpreise*1).toFixed(2) + '€<br/>';
				content += '<strong>Anteil Eigentumswohnung:</strong> ' +  (trends[d.id].Anteil_ETW*100).toFixed(2) + '%<br/>';
				content += '<strong>Anteil ALG II Geeignete Wohnungen:</strong> ' +  (trends[d.id].Anteil_KDU*100).toFixed(2) + '%<br/>';
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

	GentriMap.trendsMatrix = function() {

		// find the trend matrix div
		var $matrixbox = $('#trend-matrix'),
		$matrix = $('#matrix'),
		trends;

		return {
			init : function() {
				
				// prepare the div by making it visible, dynamically setting the div height to match the screen
				GentriMap.active = 'trendsMatrix';
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
									.text("Sozio-Demographisches Index");


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
							    .text("Wohnen Index");

						  
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
							
					svg.append("line")
							.attr("x1", x(collection[1].Soz_Boarder))
							.attr("y1", y(4))
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

							

					// define the different types of arrow heads (small, medium and large for hover/highlight interaction)

					/*svg.append("defs")
						.append("marker")
							.attr("id", "arrow")
							.attr("viewBox", "0 0 10 10")
							.attr("refX", 0)
							.attr("refY", 5)
							.attr("markerUnits", "strokeWidth")
							.attr("markerWidth", 4)
							.attr("markerHeight", 4)
							.attr("orient", "auto")
							.append("path")
								.attr("d", "M 0 0 L 10 5 L 0 10 z")
								.attr('stroke-width',0)
								.attr('fill', "grey")
								.attr("stroke", "grey")
								.attr("class","arrow");
					d3.select("defs")
						.append("marker")
							.attr("id", "arrow-hover")
							.attr("viewBox", "0 0 10 10")
							.attr("refX", 0)
							.attr("refY", 5)
							.attr("markerUnits", "strokeWidth")
							.attr("markerWidth", 4)
							.attr("markerHeight", 4)
							.attr("orient", "auto")
							.append("path")
								.attr("d", "M 0 0 L 10 5 L 0 10 z")
								.attr('stroke-width',0)
								.attr('fill', "black")
								.attr("stroke", "white")
								.attr("class","arrow");
					d3.select("defs")
						.append("marker")
							.attr("id", "arrow-emphasis")
							.attr("viewBox", "0 0 10 10")
							.attr("refX", 0)
							.attr("refY", 5)
							.attr("markerUnits", "strokeWidth")
							.attr("markerWidth", 4)
							.attr("markerHeight", 4)
							.attr("orient", "auto")
							.append("path")
								.attr("d", "M 0 0 L 10 5 L 0 10 z")
								.attr('stroke-width',0)
								.attr('fill', "black")
								.attr("stroke", "black")
								.attr("class","arrow");
					d3.select("defs")
						.append("marker")
							.attr("id", "arrow-deemphasis")
							.attr("viewBox", "0 0 10 10")
							.attr("refX", 0)
							.attr("refY", 5)
							.attr("markerUnits", "strokeWidth")
							.attr("markerWidth", 4)
							.attr("markerHeight", 4)
							.attr("orient", "auto")
							.append("path")
								.attr("d", "M 0 0 L 10 5 L 0 10 z")
								.attr('stroke-width',0)
								.attr('fill', "lightgrey")
								.attr('fill', "rgba(0,0,0,.1)")
								.attr("stroke", "black")
								.attr("class","arrow");*/

			   		
			   		// add the actual trend lines to the cartesian graph
			   		// set the x and y coordinates using the x() and y() functions 
			   		// defined earlier when we set up the axes

			   		/*var trends = svg.selectAll("line.trend-arrow")
					  	.data(collection)
						.enter().append("line")
									.attr("x1", function(d) { return x(d.Wohn_07)})                 
									.attr("y1", function(d) { return y(d.SozD_07)})                    
									.attr("x2", function(d) { return x(d.Wohn_10)})
				                    .attr("y2", function(d) { return y(d.SozD_10)})
				                    .attr("stroke-width", 3)
				                    .attr("stroke", "grey")
				                    .attr("class", function(d) { return setnineclass(d) + " " + d.Stadtteil})
				                    .attr("marker-end","url(#arrow)");*/
				    
				    var trends = svg.selectAll("circle.trend-arrow")
					  	.data(collection)
						.enter().append("circle")
									.attr("cx", function(d) { return x(d.SozD_Change)})                 
									.attr("cy", function(d) { return y(d.Wohn_Change)})                    
									.attr("r", "5")
				                    .attr("stroke-width", 1)
				                    .attr("stroke", "grey")
				                    .attr("class", function(d) { return setnineclass(d) + " " + d.Stadtteil})
				    

				    
				    // add the names and IDs of all the city districts to the select drop down menu
				    var select = d3.selectAll('select.matrix-filter');

				    select.append("option").attr("value","all").text("Alle Stadtteile");

				    select.selectAll("option.stadtteil")
				    	.data(collection)
				    	.enter().append("option")
				    		.attr("value", function(d) { return d.Stadtteil} ).text(function(d) {return d.Stadtteil} );

				    setCircleInfo();
				    setLegendListeners();
				    setSelectListener();

			   	});

				
			},

			// remove the matrix and all event listeners
			destroy : function() {
				
				d3.select("#matrix svg").remove();
				$matrixbox.addClass("invisible");
				d3.selectAll('circle').on('mouseenter',null).on('mouseleave',null);
				d3.selectAll('.colours a').on('mouseenter',null).on('mouseleave',null).on('click',null);
				$('#matrix-info').empty();
			}
		}

		// Set listener for hovering on the arrows. This selects the info 
		// that should be displayed in the box on the right, like the 
		// district name and the amount of change

		function setCircleInfo() {
		
		
			
			d3.selectAll('circle').on('mouseenter',function(d) {

				if(d3.select(this).classed('deemphasis')) return;

				d3.select(this).classed('superemphasis', true)//.attr("marker-end","url(#arrow-hover)");
				var infoContent = '<h3>' + d.Stadtteil + '</h3><h4>' + d.Bezirk + '</h4>';
				infoContent += '<strong>Sozio-Demographisches Index</strong>';
				if (parseFloat(d.SozD_10) - parseFloat(d.SozD_07) > 0) {
					infoContent += '<p class="index-trend positive">+' + (parseFloat(d.SozD_10) - parseFloat(d.SozD_07)).toFixed(2) + '</p>';
				} else {
					infoContent += '<p class="index-trend negative">' + (parseFloat(d.SozD_10) - parseFloat(d.SozD_07)).toFixed(2) + '</p>';
				}
				if (parseFloat(d.Wohn_Change) > 0) {
					infoContent += '<strong>Wohnen Index</strong><p class="index-trend positive">+' + parseFloat(d.Wohn_Change).toFixed(2) + '</p>';
				} else {
					infoContent += '<strong>Wohnen Index</strong><p class="index-trend negative">' + parseFloat(d.Wohn_Change).toFixed(2) + '</p>';
				}
				
				
				$('#matrix-info').html(infoContent);

			}).on('mouseleave', function(d) {
				var theCircle = d3.select(this);
				if(theCircle.classed('deemphasis')) return;
				if(theCircle.classed('emphasis')) {
					theCircle.classed('superemphasis', false)//.attr("marker-end","url(#arrow-emphasis)");
				} else {
					theCircle.classed('superemphasis', false)//.attr("marker-end","url(#arrow)");
				}
				
				
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

					relatedAreas.classed("emphasis", true).classed("deemphasis", false).attr("marker-end", "url(#arrow-emphasis)");
					nonrelatedAreas.classed("deemphasis", true).classed("emphasis", false).attr("marker-end", "url(#arrow-deemphasis)");
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
				if(!theSquare.classed("active")) {
					relatedAreas.classed("emphasis", false);
					if (nonrelatedAreas.size() == theAreas.size() - relatedAreas.size()) {
						nonrelatedAreas.classed("deemphasis", false).attr("marker-end", "url(#arrow)");
						relatedAreas.attr("marker-end", "url(#arrow)");
					} else {
						relatedAreas.classed("deemphasis", true).attr("marker-end", "url(#arrow-deemphasis)");
						relatedAreas.attr("marker-end", "url(#arrow-deemphasis)");
					}
					
				}
					
			}).on('click',function(e) {
				d3.event.preventDefault();
				 $('select.matrix-filter').prop("selectedIndex",0);
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
					relatedAreas.classed("emphasis active", true).classed("deemphasis", false).attr("marker-end", "url(#arrow-emphasis)");
					nonrelatedAreas.classed("deemphasis", true).classed("emphasis", false).attr("marker-end", "url(#arrow-deemphasis)");
					theSquare.classed("active", true);

				} else {
					relatedAreas.classed("active", false);
					theSquare.classed("active", false);	
					if (nonrelatedAreas.size() != theAreas.size() - relatedAreas.size()) {
						relatedAreas.classed("deemphasis", true).classed("emphasis",false).attr("marker-end", "url(#arrow-deemphasis)");
					}				
				}
				
			})

		}

		// Listener for select/drop down menu. Highlight (emphasis) only the selected city district

		function setSelectListener() {
			var select = d3.selectAll('select.matrix-filter').on("change",function(d) {

				d3.selectAll('.colours a').classed("active",false);
				d3.selectAll("circle").classed("active",false);
				var stadtteil = this.options[this.selectedIndex].value;
				if (stadtteil == "all") {
					d3.selectAll('circle').classed("deemphasis",false).classed("emphasis",false)//.attr("marker-end", "url(#arrow)");
				} else {
					d3.selectAll('circle').classed("deemphasis",true)//.attr("marker-end", "url(#arrow-deemphasis)");
					d3.selectAll('circle.' + stadtteil).classed("emphasis",true).classed("deemphasis",false)//.attr("marker-end", "url(#arrow-emphasis)");
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
			if (d.SozD_Change < -0 && d.SozD_Change > parseFloat(d.Soz_Boarder)) {
				nineclass += " downsd";	
			}
			else if (d.SozD_Change < 1 && d.SozD_Change > parseFloat(d.Soz_Boarder)) {
				nineclass += " midsd";	
			}
			else if (d.SozD_Change >= 1) {
				nineclass += " upsd";	
			}

			return nineclass + " trend-arrow";
		
		}
	}();

	/*
	*
	*	Start third visualisation
	*
	*/

		GentriMap.wanderung = function() {

		// find the trend matrix div
		var $matrixbox = $('#trend-matrix'),
		$matrix = $('#matrix'),
		trends;

		return {
			init : function() {
				
				// prepare the div by making it visible, dynamically setting the div height to match the screen
				GentriMap.active = 'wanderung';
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
				      .attr("transform", "translate(0," + (width * 1/2) + ")")
				      .call(xAxis)
				 				.append("text")
					  			.attr("class", "label")
					  			.attr("x", width)
				      		.attr("y", -6)
									.style("text-anchor", "end")
									.text("Sozio-Demographisches Index");


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
							    .text("Wohnen Index");

					// define the different types of arrow heads (small, medium and large for hover/highlight interaction)

					/*svg.append("defs")
						.append("marker")
							.attr("id", "arrow")
							.attr("viewBox", "0 0 10 10")
							.attr("refX", 0)
							.attr("refY", 5)
							.attr("markerUnits", "strokeWidth")
							.attr("markerWidth", 4)
							.attr("markerHeight", 4)
							.attr("orient", "auto")
							.append("path")
								.attr("d", "M 0 0 L 10 5 L 0 10 z")
								.attr('stroke-width',0)
								.attr('fill', "grey")
								.attr("stroke", "grey")
								.attr("class","arrow");
					d3.select("defs")
						.append("marker")
							.attr("id", "arrow-hover")
							.attr("viewBox", "0 0 10 10")
							.attr("refX", 0)
							.attr("refY", 5)
							.attr("markerUnits", "strokeWidth")
							.attr("markerWidth", 4)
							.attr("markerHeight", 4)
							.attr("orient", "auto")
							.append("path")
								.attr("d", "M 0 0 L 10 5 L 0 10 z")
								.attr('stroke-width',0)
								.attr('fill', "black")
								.attr("stroke", "white")
								.attr("class","arrow");
					d3.select("defs")
						.append("marker")
							.attr("id", "arrow-emphasis")
							.attr("viewBox", "0 0 10 10")
							.attr("refX", 0)
							.attr("refY", 5)
							.attr("markerUnits", "strokeWidth")
							.attr("markerWidth", 4)
							.attr("markerHeight", 4)
							.attr("orient", "auto")
							.append("path")
								.attr("d", "M 0 0 L 10 5 L 0 10 z")
								.attr('stroke-width',0)
								.attr('fill', "black")
								.attr("stroke", "black")
								.attr("class","arrow");
					d3.select("defs")
						.append("marker")
							.attr("id", "arrow-deemphasis")
							.attr("viewBox", "0 0 10 10")
							.attr("refX", 0)
							.attr("refY", 5)
							.attr("markerUnits", "strokeWidth")
							.attr("markerWidth", 4)
							.attr("markerHeight", 4)
							.attr("orient", "auto")
							.append("path")
								.attr("d", "M 0 0 L 10 5 L 0 10 z")
								.attr('stroke-width',0)
								.attr('fill', "lightgrey")
								.attr('fill', "rgba(0,0,0,.1)")
								.attr("stroke", "black")
								.attr("class","arrow");*/

			   		
			   		// add the actual trend lines to the cartesian graph
			   		// set the x and y coordinates using the x() and y() functions 
			   		// defined earlier when we set up the axes

			   		/*var trends = svg.selectAll("line.trend-arrow")
					  	.data(collection)
						.enter().append("line")
									.attr("x1", function(d) { return x(d.Wohn_07)})                 
									.attr("y1", function(d) { return y(d.SozD_07)})                    
									.attr("x2", function(d) { return x(d.Wohn_10)})
				                    .attr("y2", function(d) { return y(d.SozD_10)})
				                    .attr("stroke-width", 3)
				                    .attr("stroke", "grey")
				                    .attr("class", function(d) { return setnineclass(d) + " " + d.Stadtteil})
				                    .attr("marker-end","url(#arrow)");*/
				    
				    var trends = svg.selectAll("circle.trend-arrow")
					  	.data(collection)
						.enter().append("circle")
									.attr("cx", function(d) { return x(d.SozD_07)})                 
									.attr("cy", function(d) { return y(d.Wohn_07)})                    
									.attr("r", "5")
				                    .attr("stroke-width", 1)
				                    .attr("stroke", "grey")
				                    .attr("class", function(d) { return setnineclass(d) + " " + d.Stadtteil})
				    

				    
				    // add the names and IDs of all the city districts to the select drop down menu
				    var select = d3.selectAll('select.matrix-filter');

				    select.append("option").attr("value","all").text("Alle Stadtteile");

				    select.selectAll("option.stadtteil")
				    	.data(collection)
				    	.enter().append("option")
				    		.attr("value", function(d) { return d.Stadtteil} ).text(function(d) {return d.Stadtteil} );

				    setCircleInfo();
				    setLegendListeners();
				    setSelectListener();

			   	});

				
			},

			// remove the matrix and all event listeners
			destroy : function() {
				
				d3.select("#matrix svg").remove();
				$matrixbox.addClass("invisible");
				d3.selectAll('circle').on('mouseenter',null).on('mouseleave',null);
				d3.selectAll('.colours a').on('mouseenter',null).on('mouseleave',null).on('click',null);
				$('#matrix-info').empty();
			}
		}

		// Set listener for hovering on the arrows. This selects the info 
		// that should be displayed in the box on the right, like the 
		// district name and the amount of change

		function setCircleInfo() {
		
		
			
			d3.selectAll('circle').on('mouseenter',function(d) {

				if(d3.select(this).classed('deemphasis')) return;

				d3.select(this).classed('superemphasis', true)//.attr("marker-end","url(#arrow-hover)");
				var infoContent = '<h3>' + d.Stadtteil + '</h3><h4>' + d.Bezirk + '</h4>';
				infoContent += '<strong>Sozio-Demographisches Index</strong>';
				if (parseFloat(d.SozD_10) - parseFloat(d.SozD_07) > 0) {
					infoContent += '<p class="index-trend positive">+' + (parseFloat(d.SozD_10) - parseFloat(d.SozD_07)).toFixed(2) + '</p>';
				} else {
					infoContent += '<p class="index-trend negative">' + (parseFloat(d.SozD_10) - parseFloat(d.SozD_07)).toFixed(2) + '</p>';
				}
				if (parseFloat(d.Wohn_Change) > 0) {
					infoContent += '<strong>Wohnen Index</strong><p class="index-trend positive">+' + parseFloat(d.Wohn_Change).toFixed(2) + '</p>';
				} else {
					infoContent += '<strong>Wohnen Index</strong><p class="index-trend negative">' + parseFloat(d.Wohn_Change).toFixed(2) + '</p>';
				}
				
				
				$('#matrix-info').html(infoContent);

			}).on('mouseleave', function(d) {
				var theCircle = d3.select(this);
				if(theCircle.classed('deemphasis')) return;
				if(theCircle.classed('emphasis')) {
					theCircle.classed('superemphasis', false)//.attr("marker-end","url(#arrow-emphasis)");
				} else {
					theCircle.classed('superemphasis', false)//.attr("marker-end","url(#arrow)");
				}
				
				
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

					relatedAreas.classed("emphasis", true).classed("deemphasis", false).attr("marker-end", "url(#arrow-emphasis)");
					nonrelatedAreas.classed("deemphasis", true).classed("emphasis", false).attr("marker-end", "url(#arrow-deemphasis)");
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
				if(!theSquare.classed("active")) {
					relatedAreas.classed("emphasis", false);
					if (nonrelatedAreas.size() == theAreas.size() - relatedAreas.size()) {
						nonrelatedAreas.classed("deemphasis", false).attr("marker-end", "url(#arrow)");
						relatedAreas.attr("marker-end", "url(#arrow)");
					} else {
						relatedAreas.classed("deemphasis", true).attr("marker-end", "url(#arrow-deemphasis)");
						relatedAreas.attr("marker-end", "url(#arrow-deemphasis)");
					}
					
				}
					
			}).on('click',function(e) {
				d3.event.preventDefault();
				 $('select.matrix-filter').prop("selectedIndex",0);
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
					relatedAreas.classed("emphasis active", true).classed("deemphasis", false).attr("marker-end", "url(#arrow-emphasis)");
					nonrelatedAreas.classed("deemphasis", true).classed("emphasis", false).attr("marker-end", "url(#arrow-deemphasis)");
					theSquare.classed("active", true);

				} else {
					relatedAreas.classed("active", false);
					theSquare.classed("active", false);	
					if (nonrelatedAreas.size() != theAreas.size() - relatedAreas.size()) {
						relatedAreas.classed("deemphasis", true).classed("emphasis",false).attr("marker-end", "url(#arrow-deemphasis)");
					}				
				}
				
			})

		}

		// Listener for select/drop down menu. Highlight (emphasis) only the selected city district

		function setSelectListener() {
			var select = d3.selectAll('select.matrix-filter').on("change",function(d) {

				d3.selectAll('.colours a').classed("active",false);
				d3.selectAll("circle").classed("active",false);
				var stadtteil = this.options[this.selectedIndex].value;
				if (stadtteil == "all") {
					d3.selectAll('circle').classed("deemphasis",false).classed("emphasis",false)//.attr("marker-end", "url(#arrow)");
				} else {
					d3.selectAll('circle').classed("deemphasis",true)//.attr("marker-end", "url(#arrow-deemphasis)");
					d3.selectAll('circle.' + stadtteil).classed("emphasis",true).classed("deemphasis",false)//.attr("marker-end", "url(#arrow-emphasis)");
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
			if (d.SozD_Change < -0 && d.SozD_Change > parseFloat(d.Soz_Boarder)) {
				nineclass += " downsd";	
			}
			else if (d.SozD_Change < 1 && d.SozD_Change > parseFloat(d.Soz_Boarder)) {
				nineclass += " midsd";	
			}
			else if (d.SozD_Change >= 1) {
				nineclass += " upsd";	
			}

			return nineclass + " trend-arrow";
		
		}
	}();	

	/*GentriMap.wanderung = function() {
		var bezirkDataOut = {},
		bezirkDataIn = {},
		bezirkDataSaldo = {},
		mode= "saldo",
		$wanderbox = $('#wanderung'),
		$wander = $('#map-wrap'),
		map,
		collection,
		bounds,
		path,
		line,
		svg,
		bezirke,
		migrationPaths,
		sameBezirk,
		totalBerlin;
		return {
			init : function() {
				
				GentriMap.active = 'wanderung';
				$wanderbox.removeClass("invisible");
				$wander.height($(window).height()-250 > 500 ? $(window).height()-250 : 500);
				map = drawMap('wanderungmap');
				

				d3.json("_/data/wanderung/alt_bezirke.geojson", function(collection) {

					collection.features.sort(function(a,b) { return parseInt(a.properties.OBJECTID) - parseInt(b.properties.OBJECTID) } );
					for (i=0;i<collection.features.length;i++) {
						collection.features[i].id = i;
					}

				  	d3.csv("_/data/wanderung/migration.csv", function(data) {
					
				  		for(i=0;i<23;i++) {
				  			bezirkDataOut[i] = {};
				  			bezirkDataOut[i].name = data[(i)*23].von_altb;
				  			bezirkDataOut[i].sameBezirk = data[(i)*23 + i].anzahl * 1;
				  			var totalBerlin = 0;
				  			var destinations = [];
				  			for (j=0;j<23;j++) {
				  				
				  				totalBerlin += data[(i)*23+j].anzahl * 1;
				  				destinations[j] = {
				  					"nach_altb" : data[(i)*23+j].nach_alt,
				  					"anzahl" : data[(i)*23+j].anzahl,
				  					"id" : data[(i)*23+j].nid_altb			
				  				}
				  				
				  			}
				  			bezirkDataOut[i].totalBerlin = totalBerlin;
				  			bezirkDataOut[i].otherBezirk = bezirkDataOut[i].totalBerlin - bezirkDataOut[i].sameBezirk;
				  			bezirkDataOut[i].destinations = destinations;

				  			bezirkDataOut[i].destinations.sort(function(a,b) {
								return parseInt(b.anzahl) - parseInt(a.anzahl);
							});

				  		}

				  		for(i=0;i<23;i++) {
				  			bezirkDataIn[i] = {};
				  			bezirkDataIn[i].name = data[i].nach_alt;
				  			bezirkDataIn[i].sameBezirk = data[(i)*23 + i].anzahl * 1;
				  			var totalBerlin = 0;
				  			var sources = [];
				  			for (j=0;j<23;j++) {
				  				
				  				totalBerlin += data[i+j*23].anzahl * 1;
				  				sources[j] = {
				  					"von_altb" : data[i+j*23].von_altb,
				  					"anzahl" : data[i+j*23].anzahl,
				  					"id" : data[(i)*23+j].nid_altb	  				
				  				}
				  				
				  			}
				  			bezirkDataIn[i].totalBerlin = totalBerlin;
				  			bezirkDataIn[i].otherBezirk = bezirkDataIn[i].totalBerlin - bezirkDataIn[i].sameBezirk;
				  			bezirkDataIn[i].sources = sources;

				  			bezirkDataIn[i].sources.sort(function(a,b) {
								return parseInt(b.anzahl) - parseInt(a.anzahl);
							});

				  		}

				  		for(i=0;i<23;i++) {

				  			bezirkDataSaldo[i] = {};
				  			bezirkDataSaldo[i].name = bezirkDataIn[i].name;
				  			bezirkDataSaldo[i].saldo = bezirkDataIn[i].otherBezirk - bezirkDataOut[i].otherBezirk;
				  			var partners = [];
				  			for (j=0;j<23;j++) {
				  				
				  				partners[j] = {
				  					"partner_altb" : data[i+j*23].von_altb,
				  					"anzahl" : data[i+j*23].anzahl - data[(i)*23+j].anzahl,
				  					"id" : data[(i)*23+j].nid_altb	  				
				  				}
				  				
				  			}

				  			bezirkDataSaldo[i].partners = partners;
				  			bezirkDataSaldo[i].partners.sort(function(a,b) {
								return Math.abs(parseInt(b.anzahl)) - Math.abs(parseInt(a.anzahl));
							});


				  		}

				  		addMapOverlay(map,collection);
				  		setButtonControls();
				  		setMapListeners();
				  		initComplete = true;
				  	});
				
			  	});
				
			},
			destroy : function() {
				
				if (initComplete) {
					map.off("viewreset", reset);
					map.remove();
					$('#wanderungmap').empty();
					$wanderbox.addClass("invisible");
					d3.selectAll(".direction-control").on("click", null);
					bezirke.on("click", null);
					
				} else {
					setTimeout(destroy, 500);
				}
			}
		}

		function addMapOverlay(map, collection) {

			svg = d3.select(map.getPanes().overlayPane).append("svg"),
			defs = svg.append("defs"),
		    g = svg.append("g").attr("class", "leaflet-zoom-hide");
				
			bounds = d3.geo.bounds(collection);
			path = d3.geo.path().projection(project);
			line = d3.svg.line();

			  	line 	.x(function(d) { return d.x; })
					    .y(function(d) { return d.y; })
					    .interpolate("basis");

			bezirke = g.selectAll("path.bezirke")
			  	.data(collection.features)
				.enter().append("path")
				.attr("class","bezirke");

			migrationPaths = g.selectAll("path.migration")
				.data([0,1,2,3,4,5,6,7,8,9])
				.enter().append("path")
				.attr("class","migration");	

			totalBerlin = g.selectAll("circle.totalBerlin")
			  	.data(collection.features)
				.enter().append("circle")
				.attr("class","totalBerlin");

			sameBezirk = g.selectAll("circle.sameBezirk")
			  	.data(collection.features)
				.enter().append("circle")
				.attr("class","sameBezirk");

			

			var arrow = defs.append("marker")
							.attr("id", "arrow")
							.attr('viewBox',"0 0 10 10")
							.attr('refX',"0")
							.attr('refY', '5')
							.attr('markerUnits', 'strokeWidth')
							.attr('markerWidth', '4')
							.attr('markerHeight', '3')
							.attr('orient', 'auto');
			var arrowPath = arrow.append('path')
								.attr("d", "M 0 0 L 10 5 L 0 10 z");

			bezirke.attr("fill","rgba(0,0,0,.5)").attr("stroke","white").order();

			reset();

			map.on("viewreset", reset);

		}


		// Reposition the SVG to cover the bezirke.
		function reset(direction) {
			var bottomLeft = project(bounds[0]),
			    topRight = project(bounds[1]);

			svg .attr("width", topRight[0] - bottomLeft[0])
			    .attr("height", bottomLeft[1] - topRight[1])
			    .style("margin-left", bottomLeft[0] + "px")
			    .style("margin-top", topRight[1] + "px");

			g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

			bezirke.attr("d", path);

			if (direction == "in") {
				drawIn(topRight[0] - bottomLeft[0]);
			} else if (direction == "saldo") {
				drawSaldo(topRight[0] - bottomLeft[0]);
			}
			else if  (direction == "out") {
				drawOut(topRight[0] - bottomLeft[0]);
			} else {
				drawSaldo(topRight[0] - bottomLeft[0]);
			}

			migrationPaths.attr("d", "M0,0,0,0");

		}

		function drawOut(width) {
			d3.selectAll(".wander-buttons span").classed("disabled", false);
			var btn = d3.select('#out').classed("disabled", true);

			totalBerlin	.attr("r", function(d) { return Math.sqrt((bezirkDataOut[d.id].totalBerlin)/(20000/width)/Math.PI);})
						.attr("cy", function(d) {
							return path.centroid(d)[1];
						})
						.attr("cx", function(d) {
							return path.centroid(d)[0];
						})
						.attr("fill", "#D7191C")
						.attr("stroke", "black");
			
		}

		function drawIn(width) {
			d3.selectAll(".wander-buttons span").classed("disabled", false);
			var btn = d3.select('#in').classed("disabled", true);

			totalBerlin	.attr("r", function(d) {
							return Math.sqrt((bezirkDataIn[d.id].totalBerlin)/(20000/width)/Math.PI);
						})
						.attr("cy", function(d) {
							return path.centroid(d)[1];
						})
						.attr("cx", function(d) {
							return path.centroid(d)[0];
						})
						.attr("fill", "#2C7BB6")
						.attr("stroke", "black");
				
		}

		function drawSaldo(width) {
			d3.selectAll(".wander-buttons span").classed("disabled", false);
			var btn = d3.select('#saldo').classed("disabled", true);

			totalBerlin	.attr("r", function(d) {
							return Math.sqrt((Math.abs(bezirkDataSaldo[d.id].saldo))/(20000/width)/Math.PI);
						})
						.attr("cy", function(d) {
							return path.centroid(d)[1];
						})
						.attr("cx", function(d) {
							return path.centroid(d)[0];
						})
						.attr("fill", function(d) {
							if(bezirkDataSaldo[d.id].saldo <= 0) {
								return "#D7191C";
							} else {
								return "#2C7BB6";
							}
						})
						.attr("stroke", "black");
				
		}
		function setButtonControls() {
			d3.selectAll(".direction-control").on("click", function(e) {

				d3.event.preventDefault();

				d3.select("#info").html("");
				if (d3.select(this.parentNode).classed("disabled")) { 
					return;
				}
				mode = d3.select(this.parentNode).attr("id");
				var description ="";
				if(mode =="in") {
					description = "<p>Die Karte stellt die Zuzüge aller innerstädtischen Umzüge über die Bezirksgrenzen für die Altbezirke im Jahr 2010 dar. Der Umfang der Zuzüge (blau) wird in der Größer der Punkte dargestellt.</p><p>Mit dem Cursor können die Zuzüge in ausgewählten Bezirke aus anderen Berliner Stadtteilen angezeigt werden. Die Stärke der Linien zeigt den Umfang der Zuzüge.</p><p>Quelle: Amt für Statistik Berlin-Brandenburg</p>";
				}else if (mode=="out") {
					description = "<p>Die Karte stellt die Fortzüge aller innerstädtischen Umzüge über die Bezirksgrenzen für die Altbezirke im Jahr 2010 dar. Der Umfang der Fortzüge (rot) wird in der Größer der Punkte dargestellt.</p><p>Mit dem Cursor können die Fortzug der ausgewählten Bezirke in anderen Berliner Stadtteilen angezeigt werden. Die Stärke der Linien zeigt den Umfang der Fortzüge.</p><p>Quelle: Amt für Statistik Berlin-Brandenburg</p>";
				}else if (mode=="saldo") {
					description = "<p>Die Karte stellt das Wanderungssaldo aller innerstädtischen Umzug über die Bezirksgrenzen für die Altbezirke im Jahr 2010 dar. Der Umfang der Wanderungsgewinne (blau) und Wanderungsverluste (rot) wird in der Größer der Punkte dargestellt. </p><p>Mit dem Cursor können die Wanderungsbilanzen der ausgewählten Bezirke mit anderen Berliner Stadtteilen angezeigt werden. Die Stärke der Linien zeigt den Umfang der Wanderungsgewinne und -verluste.</p><p>Quelle: Amt für Statistik Berlin-Brandenburg</p>";
				}
				$('.wanderung-description').fadeOut(200,function() {
					$(this).html(description).fadeIn();
				});
				reset(mode); 
				return;

			});
		}
		function setMapListeners() {
			bezirke.on("click", function(d) {
				if(mode =="in") {

					var thisBezirk = bezirkDataIn[d.id];

					var centrePoint = path.centroid(d);

					var sourceBezirke = [];

					var sourcePoints = [];

					var allPoints = [];

					var infoHead = "<h2>{{properties.Bezirk}}</h2>";

					infoHead += "<h4>Binnenwanderung</h4>" + numberWithCommas(thisBezirk.sources[0].anzahl) + "";

					infoHead += "<h4>Gesamte Zuzüge</h4>" + numberWithCommas(thisBezirk.totalBerlin) + "";

					infoHead += "<h4>Zuzüge</h4>";
					
					var infoList = "<table class='wanderung-table'>{{list}}</table>",
					    infoItem = "<tr><td>{{source}}</td><td class='right'>{{anzahl}}</td></tr>",
					    sources = "",
					    otherSources = "";

					var infoFoot = "";

					for (i=0; i<10; i++){
					    sources += tim(infoItem, {source: thisBezirk.sources[i+1].von_altb, anzahl : numberWithCommas(thisBezirk.sources[i+1].anzahl)});
					    sourceBezirke[i] = thisBezirk.sources[i].id;
					    sourcePoints[i] = path.centroid(d3.select(bezirke[0][sourceBezirke[i]]).datum());
					    allPoints[i] = {
					    	anzahl : thisBezirk.sources[i].anzahl, 
					    	points : [{ x : sourcePoints[i][0], y : sourcePoints[i][1] },{ x : centrePoint[0], y : centrePoint[1]}],
					    	index : i
					    };
					}

					

					d3.select("#info").html(tim(infoHead,d) + tim(infoList, {list: sources}) + infoFoot);

					migrationPaths.transition().delay(0);

					migrationPaths	.data(allPoints)
									.attr("stroke","#2C7BB6")
									.attr("stroke-width", function(d) {
										if (d.index == 0) return 0;
										return d.anzahl/100;
									})
									.attr("d", function(d) {
										return line(d.points);
									})
									.attr("stroke-dasharray", dashArray)
									
							
									.transition()
										.delay(function(d) {return d.index * 150;})
									    .duration(function(d){ return this.getTotalLength() / .25})
									    .ease("linear")
									    .attr("stroke-dasharray", dashArrayNull);

				}

				if(mode == "out") {

					var bottomLeft = project(bounds[0]),
				    topRight = project(bounds[1]);

					var thisBezirk = bezirkDataOut[d.id];

					var centrePoint = path.centroid(d);

					var destinationBezirke = [];

					var destinationPoints = [];

					var allPoints = [];

					var infoHead = "<h2>{{properties.Bezirk}}</h2>";

					infoHead += "<h4>Binnenwanderung</h4>" + numberWithCommas(thisBezirk.destinations[0].anzahl) + "";

					infoHead += "<h4>Gesamte Fortzüge</h4>" + numberWithCommas(thisBezirk.totalBerlin) + "";

					infoHead += "<h4>Fortzüge</h4>";

					var infoList = "<table class='wanderung-table'>{{list}}</table>",
					    infoItem = "<tr><td>{{destination}}</td><td class='right'>{{anzahl}}</td></tr>",
					    destinations = "";

					for (i=0; i<10; i++){
					    destinations += tim(infoItem, {destination: bezirkDataOut[d.id].destinations[i+1].nach_altb, anzahl : numberWithCommas(bezirkDataOut[d.id].destinations[i+1].anzahl)});
						destinationBezirke[i] = thisBezirk.destinations[i].id;
					    destinationPoints[i] = path.centroid(d3.select(bezirke[0][destinationBezirke[i]]).datum());
					    allPoints[i] = {
					    	anzahl : thisBezirk.destinations[i].anzahl, 
					    	points : [{ x : centrePoint[0], y : centrePoint[1]} , { x : destinationPoints[i][0], y : destinationPoints[i][1] }],
					    	index : i,
					    	destinationID : bezirkDataOut[d.id].destinations[i].id
					    };
					}
					d3.select("#info").html(tim(infoHead,d) + tim(infoList, {list: destinations}));

					migrationPaths.transition().delay(0);

					migrationPaths	.data(allPoints)
									.attr("d", function(d) {
										return line(d.points);
									})
									.attr("stroke","#D7191C")
									.attr("stroke-width", function(d) {
										if (d.index == 0) return 0;
										return d.anzahl/100;
									})
									.attr("stroke-dasharray", dashArray)
							
									.transition()
										.delay(function(d) {return d.index * 150;})
									    .duration(function(d){ return this.getTotalLength() / .25})
									    .ease("linear")
									    .attr("stroke-dasharray", dashArrayNull);
				}
				if(mode == "saldo") {

					var bottomLeft = project(bounds[0]),
				    topRight = project(bounds[1]);

					var thisBezirk = bezirkDataSaldo[d.id];

					var thisBezirkDetails = bezirkDataIn[d.id];

					var centrePoint = path.centroid(d);

					var partnerBezirke = [];

					var partnerPoints = [];

					var allPoints = [];

					var infoHead = "<h2>{{properties.Bezirk}}</h2>";

					infoHead += "<h4>Binnenwanderung</h4>" + numberWithCommas(thisBezirkDetails.sources[0].anzahl) + "";

					infoHead += "<h4>Gesamte Wanderungssaldo</h4>" + numberWithCommas(thisBezirk.saldo) + "";

					infoHead += "<h4>Wanderungssaldo</h4>";

					var infoList = "<table class='wanderung-table'>{{list}}</table>",
					    infoItem = "<tr><td>{{partner}}</td><td class='right'>{{anzahl}}</td></tr>",
					    partners = "";


					for (i=0; i<10; i++){
					    partners += tim(infoItem, {partner: bezirkDataSaldo[d.id].partners[i].partner_altb, anzahl : numberWithCommas(bezirkDataSaldo[d.id].partners[i].anzahl)});
						partnerBezirke[i] = thisBezirk.partners[i].id;
					    partnerPoints[i] = path.centroid(d3.select(bezirke[0][partnerBezirke[i]]).datum());
					    allPoints[i] = function() {
					    	if (thisBezirk.partners[i].anzahl < 0) {
					    		return {
							    	anzahl : thisBezirk.partners[i].anzahl, 
							    	points : [{ x : centrePoint[0], y : centrePoint[1]} , { x : partnerPoints[i][0], y : partnerPoints[i][1] }],
							    	index : i,
							    	destinationID : bezirkDataSaldo[d.id].partners[i].id
							    };
					    	} else {
					    		return {
							    	anzahl : thisBezirk.partners[i].anzahl, 
							    	points : [ { x : partnerPoints[i][0], y : partnerPoints[i][1] }, { x : centrePoint[0], y : centrePoint[1]}],
							    	index : i,
							    	destinationID : bezirkDataSaldo[d.id].partners[i].id
							    };
					    	}
					    }();
					    	
					}

					allPoints.sort(function(a,b) {
						return b.anzahl - a.anzahl;
					});
					for (i=0; i<10; i++){
						allPoints[i].index = i;
					}
					
					d3.select("#info").html(tim(infoHead,d) + tim(infoList, {list: partners}));

					migrationPaths.transition().delay(0);

					migrationPaths	.data(allPoints)
									.attr("d", function(d) {
										return line(d.points);
									})
									.attr("stroke",function(d) {
										if(d.anzahl > 0) {
											return "#2C7BB6";
										} else {
											return "#D7191C";
										}
										
									})
									.attr("stroke-width", function(d) {
										return Math.abs(d.anzahl)/100;
									})
									.attr("stroke-dasharray", dashArray)
							
									.transition()
										.delay(function(d) {return d.index * 150;})
									    .duration(function(d){ return this.getTotalLength() / .25})
									    .ease("linear")
									    .attr("stroke-dasharray", dashArrayNull);
				}
			});
		}
		function project(x) {
			var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));  
			return [point.x, point.y];
		}
	}(); */

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

		L.tileLayer('http://{s}.tile.cloudmade.com/8d3aebdf38f74388bdad35df7e604d4e/22677/256/{z}/{x}/{y}.png', {
		    key: "8d3aebdf38f74388bdad35df7e604d4e",
		    attribution: "Map data &copy; OpenStreetMap contributors, CC-BY-SA, Imagery  &copy; CloudMade",
		    styleId: 22677
		}).addTo(map);
		return map;
	}

	// Helper functions to animate the wanderung lines 
	function dashOffset() { return this.getTotalLength(); }

	function dashArray() { return 0 + " "  + this.getTotalLength(); }

	function dashArrayNull() { return this.getTotalLength() + " "  + this.getTotalLength() }

	// number formatting
	function numberWithCommas(x) {
	    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

	$('#wanderungLink').on('click',function(e) {
		e.preventDefault();
		if (GentriMap.active==='wanderung') return;
		GentriMap[GentriMap.active].destroy();
		$('.vis-navigation span').removeClass("active");
		$(this).parent('span').addClass('active');
		GentriMap.wanderung.init();
	});

});
