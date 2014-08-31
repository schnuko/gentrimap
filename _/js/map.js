define(["typology", "vendor/leaflet", "vendor/underscore.min", "vendor/d3.v3.min", "vendor/d3.tooltip", "vendor/topojson.v1.min", "vendor/queue.min"],
	function (setnineclass) {
		
		
		var $mapbox = $('#trend-karte'),
		// find the div to insert the map
		$map = $('#trendmap'),
		initComplete = false,
		trends = {},
		features,
		map,
		bounds,
		path,
		svg,
		g;

		/*
		*
		* Map Helper Functions
		*
		*/

		// scale latitude and longitude for map
		function lng2tile(lng,zoom) { return (Math.floor((lng+180)/360*Math.pow(2,zoom))); }
		function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }


		// draws map without SVG-overlay
		function drawMap(mapdiv) {

				var lat = 48.143642; //48.133032416231991;
				var lng = 11.570118; //11.649270930839434;
				var zoom =11;
				if($(window).height() < 850) zoom = 11;

				// var xtile = lng2tile(lng,zoom);
				// var ytile = lat2tile(lat,zoom);

				var map = new L.map(mapdiv).setView([lat,lng], zoom);

				// L.tileLayer('http://{s}.tile.cloudmade.com/8d3aebdf38f74388bdad35df7e604d4e/22677/256/{z}/{x}/{y}.png', {
				// L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {
				// L.tileLayer('http://a.tiles.mapbox.com/v3/examples.map-zr0njcqy/{z}/{x}/{y}.png', {
				// L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				// L.tileLayer("http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg", {

				L.tileLayer('http://a.tiles.mapbox.com/v3/examples.map-20v6611k/{z}/{x}/{y}.png', {
					attribution: "Map data &copy; OpenStreetMap contributors, CC-BY-SA, Imagery  &copy; Mapbox",
					// key: "8d3aebdf38f74388bdad35df7e604d4e",
				 	// styleId: 22677
				}).addTo(map);

				return map;

			}


		// projects spherical point [Lat,Lng] to cartesian equivalent [x, y]
		function project(x) {
			var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));  
			return [point.x, point.y];
		}


		// Positions the SVG to cover the map in the right place (repositions on zoom or drag)
		function reset() {
			var bottomLeft = project(bounds[0], map),
			    topRight = project(bounds[1], map);

			svg
				.attr("width", topRight[0] - bottomLeft[0])
			   	.attr("height", bottomLeft[1] - topRight[1])
			   	.style("margin-left", bottomLeft[0] + "px")
			   	.style("margin-top", topRight[1] + "px");

			g.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

			features.attr("d", path);
			
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
					if (nonrelatedAreas[0].length == theAreas[0].length - relatedAreas[0].length) {
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
					
					if (nonrelatedAreas[0].length == theAreas[0].length - relatedAreas[0].length) {
						thisTypDescription.classed("invisible",false);
					}

				} else {
					relatedAreas.classed("active", false);
					theSquare.classed("active", false);	
					if (nonrelatedAreas[0].length != theAreas[0].length - relatedAreas[0].length) {
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
			d3.selectAll("path.trend-area")
				// .filter(function(d) {return !d3.select(this).classed("null");})
				.tooltip(function(d, i) {

					var content,
						title;

					if (trends[d.id]['Verfügbarkeit'] === "nein") {
						content = '<div><p>No information available</p></div>';
					}
					else {
						content = '<div><p>';
						content += '<strong>Income Poverty:</strong> ' +  (trends[d.id].Einkommen_Arm*100).toFixed(2) + '% &rarr; ' + (trends[d.id].Einkommen_Arm_t2*100).toFixed(2) +'%<br/>';
						//content += '<strong>Erwachsenen Armut:</strong> ' +  (trends[d.id].Erwa_Arm*100).toFixed(2) + '%<br/>';
						//content += '<strong>Altersarmut:</strong> ' +  (trends[d.id].Alter_Arm*100).toFixed(2) + '%';
						content += '<hr/>';
						content += '<strong>Rent Price:</strong> ' +  (trends[d.id].Mietpreise*1).toFixed(2) + '€ &rarr; ' + (trends[d.id].Mietpreise_t2*1).toFixed(2) +'€<br/>';
						content += '<strong>Condominiums:</strong> ' +  (trends[d.id].Anteil_ETW*100).toFixed(2) + '% &rarr; ' + (trends[d.id].Anteil_ETW_t2*100).toFixed(2) +'%<br/>';
						content += '<strong>Affordable Flats:</strong> ' +  (trends[d.id].Anteil_KDU*100).toFixed(2) + '% &rarr; ' + (trends[d.id].Anteil_KDU_t2*100).toFixed(2) +'%<br/>';
						content += '</p></div>';
					}

					
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
				}
			);
		}

		return {

			init : function init() {

				// set up the map by making it visible, dynamically setting the size 
				$mapbox.removeClass("invisible");
				$map.height($(window).height()-250 > 500 ? $(window).height()-250 : 500);

				// draw map n div #trendmap
				map = drawMap('trendmap');

				// Import the geodata and trend data files. 
				// Info on creating topojson files here: http://bost.ocks.org/mike/map/
				// to use this code virtually unchanged, set the start of your topojson 
				// file to {"type":"Topology","objects":{"immoscout": _}}
				// queue function waits until files are fully loaded then calls ready()
				queue()
				    .defer(d3.json, "_/data/geo/immoscout.topojson")
				    // on import of trends_analysis, add each row of data (d) to the trends array. 
				    // d.StadtID is the key that links the data to the immoscout geo "features" (polygons)
				    .defer(d3.csv, "_/data/trends/trends_analysis.csv", function(d) { 
				    	// add field which corresponds to gentrification category
				    	d['category'] = setnineclass(d);
				    	trends[d.StadtTID] = d; 
				    })
				    .await(ready);

				function ready(error, collection) {

					//map our imported data from immoscout.topojson to our dataset variable
					dataset=collection;

					// add an svg vector graphic with a group element (g) as overlay to the map, 
					// ready to draw the colour coded disticts into g
					svg = d3.select(map.getPanes().overlayPane).append("svg");
			    	g = svg.append("g").attr("class", "leaflet-zoom-hide");

			    	// set the geographic boundaries of our data, 
			    	// set the map projection so d3 can draw shapes to match the underlying leaflet map
			    	bounds = d3.geo.bounds(topojson.feature(collection, collection.objects.immoscout));
			    	path = d3.geo.path().projection(project);

			    	// bind data from immoscout.topojson
			    	// first select the g element, look for any paths with class "trend-area" and select them 
			    	// (at the moment there are none, they are just about to be created)
			    	features = g.selectAll("path.trend-area")
			    		// select the topojson polygons to be the data
						.data(topojson.feature(collection, collection.objects.immoscout).features)
						// for each polygon, bind the polygon data to a new path and add it to the g element
						.enter().append("path")
						// set the path class to be one of the 9-er typology (determines colour)
						.attr("class", function (d) {
							return trends[d.id] ? trends[d.id].category : 'trend-area null';
						});

					// set up event listeners for hover and click on colour key/legend
					setLegendListeners();
					// set up event listeners for hover on city districts
					setTooltipListeners();
					// bind reset event to map zoom / pan
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
					// remove all child nodes (jQuery)
					$map.empty();
					$mapbox.addClass("invisible");
					d3.selectAll('.colours a')
						.on('mouseenter',null)
						.on('mouseleave', null)
						.on('click',null);
					d3.selectAll("path")
						.on("mouseenter",null)
						.on("mouseleave",null);
					
				} else {
					setTimeout(destroy, 500);
				}
				
			}
		};

	}
);