define(["typology", "vendor/d3.v3.min"],
	function (setnineclass) {


		

		

		return function boxplot(value) {

			// find the trend matrix div
			var $matrixbox = $('#trend-matrix'),
			$matrix = $('#matrix'),
			trends;	

			return {
				init : function() {
					
					// prepare the div by making it visible, dynamically setting the div height to match the screen
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
					    // orientation of labels
					    .orient("bottom");

					var yAxis = d3.svg.axis()
					    .scale(y)
					    // orientation of labels
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

				   		// add x axis and its labels
				   		svg
				   			.append("g")
							.attr("class", "x axis")
							.attr("transform", "translate(0," + x(0) + ")")
							.call(xAxis)
				 				.append("text")
					  			.attr("class", "label")
					  			.attr("x", width)
					      		.attr("y", -6)
								.style("text-anchor", "end")
								.text("Sozio-Demographic Index");

						// add y axis and its labels
						svg
							.append("g")
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
					    var trends = svg
							.selectAll("circle.trend-arrow")
						  	.data(collection)
							.enter()
							.append("circle")
								.attr("class", function(d) { return setnineclass(d, value) + " " + d.Stadtteil})
								.attr("hood", function(d) { return d.Stadtteil})
								.attr("cx", function(d) { return x(d["SozD_" + value])})                 
								.attr("cy", function(d) { return y(d["Wohn_" + value])})                    
								.attr("r", "5")
			                    //.attr("stroke-width", 1)
			                    //.attr("stroke", "grey")

			            // Remove neighbourhoods with no data available
			            svg.selectAll("circle.null").remove();
					    

					    // add the names and IDs of all the city districts to the select drop down menu
					    var select = d3.selectAll('select.matrix-filter');

					    select.append("option")
					    	.attr("value","all")
					    	.text("All Neighbourhoods");

					    select.selectAll("option")
					    	.data(collection)
					    	.enter()
					    	.append("option")
					    		.attr("value", function(d) { return d.Stadtteil} ).text(function(d) {return d.Stadtteil} )
					    		.attr("class", function(d) { return d['Verfügbarkeit']} );

					   	// Remove neighbourhoods with no data available
					    d3.selectAll("option.nein").remove();

					    // add Listeners
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
			};


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

					var other = d3.select("circle.emphasis.superemphasis");
						if (!other.empty() && !other.classed("active")) {
							other
								.classed("emphasis", false)
								.classed("superemphasis", false);
						}

					$('select.matrix-filter').prop("value", d3.select(this).attr('hood'));

					if(!d3.select(this).classed('active')) {
						// deemphasis is no longer used
					}

					d3.select(this).classed('emphasis', true)

					var infoContent = createInfoContent(d);
					
					$('#matrix-info').html(infoContent);

				})
				
				.on('mouseleave', function(d) {
					var theCircle = d3.select(this);
					theCircle.classed('emphasis', false);
					$('select.matrix-filter').prop("value", "all");
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
						nonrelatedAreas
							.classed("emphasis", false)
							.classed("superemphasis", false);
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
				
					d3.selectAll('.colours a')
						.classed("active",false);
					d3.selectAll("circle")
						.classed("active",false)
						.classed("superemphasis",false);

					var stadtteil = this.options[this.selectedIndex].value;

					if (stadtteil == "all") {
						d3.selectAll('circle').classed("superemphasis",false);
						d3.selectAll('circle').classed("emphasis",false);
						$('#matrix-info').empty();
					} else {
						d3.selectAll('circle').classed("superemphasis",false);
						d3.selectAll('circle').classed("emphasis",false);
						d3.selectAll('circle.' + stadtteil).classed("superemphasis",true);
						d3.selectAll('circle.' + stadtteil).classed("emphasis",true);
						
						var d = this.options[this.selectedIndex].__data__;
						var infoContent = createInfoContent(d);
						$('#matrix-info').html(infoContent);
						
					}
					
				});
			}

				
				
		};

	}
);