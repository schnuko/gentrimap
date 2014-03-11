gentrimap
=========

This GentriMap comes preloaded with Berlin data for 2007 to 2011.

Customise it to include your own data by adding your own topojson and csv files to the _/data folder.

index.html and gentrimap.js are heavily commented with more instructions.

To show a different data analysis, you should adapt the function setnineclass() in gentrimap.js to add your own classes to the city districts.

If you add the same classes to your key/legend, (see #map-legend .colours) then the hover and click interactions should continue to work as before.

To change the css, you can either edit the css/screen.css file directly, or use the SASS files. You can run compass watch on the _ directory. Bootstrap 3 and Leaflet CSS is included.