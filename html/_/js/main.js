var GentriMap = new Backbone.Marionette.Application();

GentriMap.addInitializer(function(initData) {
	GentriMap.dataSetsPrimary = new DataSets(initData.data, {comparator : 'name'});
	GentriMap.dataSetsPrimary.setDefaults({
		title : "Karte 1",
		enabled : true,
		primary : true
	});
	var dataSetsToolboxViewPrimary = new DataSetsToolboxView({
		collection: GentriMap.dataSetsPrimary
	});
	GentriMap.toolbox1.show(dataSetsToolboxViewPrimary);
	
	GentriMap.dataSetsSecondary = new DataSets(initData.data, {comparator : 'name'});
	GentriMap.dataSetsSecondary.setDefaults({
		title : "Karte 2",
		enabled : false,
		primary : false
	});
	var dataSetsToolboxViewSecondary = new DataSetsToolboxView({
		collection: GentriMap.dataSetsSecondary
	});
	GentriMap.toolbox2.show(dataSetsToolboxViewSecondary);
});

GentriMap.on('start', function() {
	Backbone.history.start();
});

GentriMap.addRegions({
	toolbox1 : '#karte-1-controls',
	toolbox2 : '#karte-2-controls',
	main : "#main"
});

DataSet = Backbone.Model.extend({
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

DataSets = Backbone.Collection.extend({
	model : DataSet,
	setDefaults : function(options) {
		this.title = options.title;
		this.enabled = options.enabled;
		this.primary = options.primary;
	}
});

DataSetOptionView = Backbone.Marionette.ItemView.extend({
	template: "#dataSetOptionView",
	tagName: 'option',
	initialize: function(){
		this.$el.prop("value", this.model.get("id"));
	}
});

DataSetsToolboxView = Backbone.Marionette.CompositeView.extend({
	initialize : function() {
		var titlefun = this.collection.title;
		this.templateHelpers.title = function() {
			return titlefun;
		}
	},
	tagName: "fieldset",
	className: "disabled",
	template: "#dataSetsToolboxView",
	templateHelpers: {
		title : function () {
			return "";
		}
	},
	itemView: DataSetOptionView,
	itemViewContainer : "select",
	events: {
		'change select': 'selectDataSet',
		'change input.minicolors': 'selectColor',
		'change .street-map-toggle' : 'streetMapToggle',
		'change .zoom-slider' : 'selectZoom',
		'change .toggle-control' : 'toggleEnable',
		'change .zoom-link' : 'toggleZoomLink'
	},
	selectColor: function(e){
		console.log(e.target.value);
		console.log($(e.delegateTarget).parent().attr('id'));
	},
	selectDataSet : function(e) {
		console.log("dataset = " + e.currentTarget.value);
	},
	streetMapToggle : function(e) {
		console.log("show map = " + e.currentTarget.checked);
	},
	selectZoom : function(e) {
		console.log("show zoom: " + $(e.target).attr("data-zoom"));
	},
	toggleEnable : function(e) {
		if (e.currentTarget.checked) {
			this.enable();
		}
		else {
			this.disable();
		}
	},
	toggleZoomLink : function(e) {
		console.log("zoom link: " + e.currentTarget.checked);
	},
	onShow : function() {
		this.$el.find('.street-map-toggle').tooltip({
			placement : 'bottom',
			title: 'Kann langsam sein'
		});

		this.$el.find('.zoom-slider').slider({
			max: 10,
			min: 1,
			step:1,
			slide: function( event, ui ) {
				$(this).attr("data-zoom", ui.value).change();
			},
			create: function(event, ui) {
				$(this).attr("data-zoom", $(this).slider('value'));
			}
		});

		this.$el.find('.zoom-slider').slider('disable');

		this.$el.find('.minicolors').minicolors({
			control: 'hue',
			theme: 'bootstrap',
			change: function(hex) {
				$(this).attr("value",hex).change();

		    }
		});
		if (this.collection.enabled) {
			this.enable();
		}
		if (this.collection.primary) {
			this.setPrimary();
		}
		
	},
	enable : function() {
		this.$el.removeClass("disabled");
		this.$el.find("[disabled]").removeAttr("disabled");
		this.$el.find('.zoom-slider').slider('enable');
	},
	setPrimary : function() {
		this.$el.find(".secondary").remove();
	},
	disable : function() {
		this.$el.addClass("disabled");
		this.$el.find(".toggle").attr("disabled", "disabled");
		this.$el.find('.zoom-slider').slider('disable');
	}
});



$(document).ready(function() {
	var initData = initialiseDataSets();
	GentriMap.start({
		data : initData
	});
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