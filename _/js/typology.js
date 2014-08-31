define([],
	function () {

		// Set the class of each city district area to reflect the trends analysis data
		// each path is passed in turn. "d" is the single polygon/geo data that is bound to the path
		// d.id lets us access the relevant entry in the trends[] array, where all the city district data like
		// trend information or poverty rates is stored
		// the class colours are then set with CSS

		return function setnineclass(d, value) {

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

			if (d.Verfügbarkeit === "nein") {
				nineclass = "null";
			}

			if (value === 'Change' || value === '07') {
				nineclass += " trend-arrow";
			}
			else {
				nineclass += " trend-area";
			}

			return nineclass;
		
		};

	}
);		

		