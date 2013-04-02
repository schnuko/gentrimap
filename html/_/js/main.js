// Toolbox display helpers

$(document).ready(function() {
	$('#toolbox .street-map-toggle').tooltip({
		placement : 'bottom',
		title: 'Kann langsam sein'
	});

	$('#toolbox .zoom-slider').slider({
		max: 10,
		min: 1,
		step:1
	});

	$('#toolbox .disabled .zoom-slider').slider('disable');

	$('#toolbox .minicolors').minicolors({
		control: 'hue',
		theme: 'bootstrap'
	});
});

//Backbone init

var GentriMap = GentriMap || {};

GentriMap.CityDataSet = Backbone.Model.extend({
	defaults: {
		minYear:  1e10,
		maxYear: -1e10,
		minValue: 1e10,
		maxValue: -1e10,
		name : "",
		years : [],
		id : ""
	}
});

GentriMap.CityData = Backbone.Collection.extend({
    model: GentriMap.CityDataSet,
    minYear:  1e10,
	maxYear: -1e10,
	activeYear: "",
	setYear : function(activeYear) {
		this.activeYear = activeYear;
		return this;
	},
	getYear : function() {
		return this.activeYear;
	}
});


GentriMap.CityDataSetOptionView = Backbone.View.extend({
    tagName: 'option',
    template: $( '#optionCityDataSet' ).html(),

    render: function() {    	
        //tmpl is a function that takes a JSON object and returns html
        var tmpl = _.template( this.template );

        //this.el is what we defined in tagName. use $el to get access to jQuery html() function
        this.$el.html( tmpl( this.model.toJSON() ) );

        return this;
    }
});

GentriMap.CityDataSelectView = Backbone.View.extend({
    el: $( '#datasets select' ),

    initialize: function( AllCityData ) {
        this.collection = AllCityData;
        this.render();
    },

    // render library by rendering each book in its collection
    render: function() {
        this.collection.each(function( item ) {
            this.renderDataSetOption( item );
        }, this );
    },

    // render a book by creating a BookView and appending the
    // element it renders to the library's element
    renderDataSetOption: function( item ) {
        var CityDataSetOptionView = new GentriMap.CityDataSetOptionView({
            model: item,
            attributes : {
            	value : item.get('id')
            }
        });
        this.$el.append( CityDataSetOptionView.render().el );
    }
});


GentriMap.CityDataSetMapView = Backbone.View.extend({
	el: $( '#main' ),
	tagName: 'div',
	template: $( '#CityDataSetMapView' ).html(),
	initialize: function( CityDataSet ) {
		this.model = CityDataSet;
       	this.render();
    },
	render: function() {
        var tmpl = _.template( this.template );
        this.$el.html( tmpl( this.model.toJSON() ) );

        $("#year-slider").slider({
        	min : this.model.get("minYear"),
        	max : this.model.get("maxYear"),
        	value : this.model.collection.getYear(),
        	slide: function( event, ui ) {
				//console.log(ui.value);
				// trigger update year
			},
			change: function( event, ui ) {
				//console.log(ui.value);
			},
			create: function(event, ui) {
				//console.log($(this).slider('value'));
			}
        });
	}

});


// Start the application
$(function() {
	//it would be better to get the data from the server with consistent IDs for models, need array of objects
	var data = initialiseDataSets();

	AllCityData = new GentriMap.CityData(data, {comparator : 'name'});
	// Initialise the drop down select boxes
	new GentriMap.CityDataSelectView(AllCityData);

	// Start our history
	Backbone.history.start();

	// this should only happen once on entry at the home page of application (or just route to default map?)
	// can probably store year info in router instead of collection
	activeSet = AllCityData.get($('#datasets select option:selected').attr("value"));
	AllCityData.setYear(activeSet.get("minYear"));

	// draw the map!
	new GentriMap.CityDataSetMapView(activeSet);
});























function initialiseDataSets() {
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
				name: name,
				years: [],
				// set very high and low numbers so we can refine these with our actual data
				minYear:  1e10,
				maxYear: -1e10,
				minValue: 1e10,
				maxValue: -1e10, 
				id : tableListIndex
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
	return tableList;
}