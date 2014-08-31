require.config({

    baseUrl: '_/js',

});

require(["map", "boxplot", "vendor/jquery-1.9.1.min"],
    function (map, boxplot) {


		/* 
		*
		* 	Our Program: GentriMap
		*	
		*	GentriMap.active records which vis we are looking at right now
		*	Gentrimap.intro, Gentrimap.trendsMap, GentriMap.trendsMatrix and GentriMap.inital 
		*   are the four parts of the program that control the data visualisations.
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
			*	Register map visualisation
			*
			*/

			GentriMap.trendsMap = map;
			
			/*
			*
			*	Register development visualisation
			*
			*/

			GentriMap.trendsMatrix = boxplot("Change");

			/*
			*
			*	Register initial state visualisation
			*
			*/

			GentriMap.initial = boxplot("07");

			/*
			*
			*	Register introduction
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
				GentriMap.active = 'trendsMap';
				GentriMap.trendsMap.init();
			});

			$('#trendMatrixLink').on('click',function(e) {
				e.preventDefault();
				if (GentriMap.active==='trendsMatrix') return;
				GentriMap[GentriMap.active].destroy();
				$('.vis-navigation span').removeClass("active");
				$(this).parent('span').addClass('active');
				GentriMap.active = "trendsMatrix";
				GentriMap.trendsMatrix.init();
			});

			$('#initialLink').on('click',function(e) {
				e.preventDefault();
				if (GentriMap.active==='initial') return;
				GentriMap[GentriMap.active].destroy();
				$('.vis-navigation span').removeClass("active");
				$(this).parent('span').addClass('active');
				GentriMap.active = "initial";
				GentriMap.initial.init();
			});

		});
	}
		
);
			
