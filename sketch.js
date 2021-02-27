
// if mouse over map and no points show up, refresh page
// sometimes aqi data doesn't get loaded properly

// base url for getting data
var baseUrl = "https://api.waqi.info";

// left tokens here

// token for aqi data
var token = "ceb3e4043ac7f55d252a0114f6a74d7bfdbd80e0";
// token for mapbox map
var mapboxToken = "pk.eyJ1IjoibWFyaWphdHJpZmtvdmljIiwiYSI6ImNqd3djNjQyejAybmw0NG93emoxeGRmZWYifQ.Xh54TQijAjg1CDy6pvBInw";

// request string for getting json
var request;
// data from json
var data;
// array that stores all the points gathered from request
var points = [];

// switches between two modes: search for points by moving the mouse, or see all points on the map
var seeAllBtn;
var seeAllLabel;
// bool indicating which state seeAllBtn is in
var seeAll = false;

// to select what kind of air quality can be searched for
var selectAirQuality;
var pickAirQualityLabel;

// to seach for specific city information
// once city is deleted from input, info in circle disapears 
// input has to be deleted char by char
// command + A delete doesn't work for removing the circle
var cityInput;
var cityInputLabel;
// to hold the point specified in the input
var newCity = 0;

var clickOnPointLabel;

// to hold the mapbox map
var map;
// get the mapbox map
var mappa = new Mappa ( 'Mapbox', mapboxToken );
// to set the map view
var options = {
  lat: 40,
  lng: 0,
  zoom: 2,
  studio: true, 
  style: 'mapbox://styles/mapbox/traffic-night-v2',
};
// to hold the canvas
var canvas;

// holds new x and y coords of a point
var pos;

class Point {

  constructor ( name, lat, lng, aqi ) {

    this.name = name;

    this.lat = lat;
    this.lng = lng;

    this.aqi = aqi;

    // 6 categories, used for viewing only specific air quality groups
    // set color of point based on aqi

    if ( aqi <= 50 ) {
      this.color = color ( 0, 239, 32, 150 );
      this.airQualityVal = 1;
    }
    else if ( aqi <= 100) {
      this.color = color ( 239, 239, 0, 150 );
      this.airQualityVal = 2;
    }
    else if ( aqi <= 150 ) {
      this.color = color ( 255, 179, 0, 150 );
      this.airQualityVal = 3;
    }
    else if ( aqi <= 200 ) {
      this.color = color ( 255, 68, 0, 150 );
      this.airQualityVal = 4;
    }
    else if ( aqi <= 300 ) {
      this.color = color ( 162, 0, 255, 150 );
      this.airQualityVal = 5;
    }
    else {
      this.color = color ( 138, 2, 21, 150 );
      this.airQualityVal = 6;
    }

    // true if point was clicked ( larger circle with info )
    this.isClicked = false;
    // true if this is the point created by using input ( larger circle with info )
    this.searched = false;
  }

  setSearched () { this.searched = true; }

  // if point was clicked, flip isClicked
  clicked () {

    pos = map.latLngToPixel( this.lat, this.lng );

    // larger radius for closing so it's easier to close the circle
    if ( ( dist ( pos.x, pos.y, mouseX, mouseY ) < 10 && !this.isClicked ) || ( this.isClicked && dist ( pos.x, pos.y, mouseX, mouseY ) < 20 )) {

      // flip isClicked if closing or if point is in selected category
      // if point clicked and category changed the point will still be displayed
      if ( selectAirQuality.value() == 0 || selectAirQuality.value() == this.airQualityVal || this.isClicked ) this.isClicked = !this.isClicked;

      mapMoved();
    }
  }

  // if isClicked or searched or in ( seeAll mode and hovered ), will display larger circle with info
  putInfoOnMap() {

    push();
    translate( pos.x, pos.y );

    // circle storing the info
    fill ( this.color );
    circle( 0, 0, map.zoom() * 45 );

    // circle is map.zoom() * 40 x map.zoom() * 40
    // text will be at a +/- map.zoom() * 10 distance from center
    textAlign ( CENTER );
    textStyle ( BOLD );

    // black letters on light background, white letters on dark backgrounds
    if ( this.airQualityVal >= 5 ) fill ( 255 );
    else fill ( 0 );
    
    // so that text fits into the box
    if ( this.name.length > 12 ) textSize ( map.zoom() * 3 );
    else if ( this.name.length > 6 ) textSize ( map.zoom() * 4 );
    else if ( this.name.length > 4  ) textSize ( map.zoom() * 6 );
    else textSize ( ( map.zoom() * 36 ) / this.name.length );
    // print name
    text ( this.name, - map.zoom() * 18, - map.zoom() * 10, map.zoom() * 36, map.zoom() * 24 );

    // print aqi
    textSize ( map.zoom() * 10 );
    text ( this.aqi, 0, map.zoom() * 10 );

    pop();

  }

  // called in draw, puts point on map if it is within bounds
  putOnMap () {

    // don't draw point if can't be visible on map
    if ( !map.map.getBounds().contains ( [ this.lat, this.lng ] ) ) return;

    pos = map.latLngToPixel ( this.lat, this.lng );

    noStroke();

    // if the point is searched or clicked it will appear on the map
    // regardless of the seeAll state and 
    // regardless of whether an air quality category is specified
    if ( this.searched || this.isClicked ) { this.putInfoOnMap(); }

    // point will not be displayed if it doesn't fall into the selected category
    else if ( selectAirQuality.value() != 0 && selectAirQuality.value() != this.airQualityVal ) return;
    
    // if in seeAll state point might be displayed
    // or if mouse close to point, point might be displayed
    else if ( seeAll || dist ( pos.x, pos.y, mouseX, mouseY ) < 50 ) {

      // if in seeAll state and mouse close to point display larger circle with info
      if ( seeAll && dist ( pos.x, pos.y, mouseX, mouseY ) < 5 ) this.putInfoOnMap();

      // display small circle
      else {

          fill ( this.color );
          circle( pos.x, pos.y, map.zoom() * 2.5 );
      }
    }
  }
};

function preload () {

  // get info from city
  //request = baseUrl + "/feed/london/?token=" + token;

  // nearest station
  //request = baseUrl + "/feed/geo:70;70/?token=" + token;

  // all stations in the rectangle defined by given lat and lon
  request = baseUrl + "/map/bounds/?latlng=-90,-180,90,180&token=" + token;

  loadJSON ( request, printJ );
}

function printJ ( data ) {

  if ( data.status == "ok" ) {

    for ( var i = 0; i < data.data.length; ++i ) {
      
      points.push( new Point( data.data[i].station.name, data.data[i].lat, data.data[i].lon, parseInt ( data.data[i].aqi ) ) );
    }
  }
}

function setup() {

  canvas = createCanvas ( windowWidth, windowHeight );

  map = mappa.tileMap ( options ); 
  map.overlay ( canvas );
  map.onChange ( mapMoved );

  seeAllLabel = createElement('p', 'Click on point to view info');
  seeAllLabel.position ( 950, 15 );
  seeAllLabel.addClass ( "labels" );

  seeAllLabel = createElement('p', 'Move mouse over map to see data');
  seeAllLabel.position ( 50, 15 );
  seeAllLabel.addClass ( "labels" );

  seeAllBtn = createButton ( "See all data" );
  seeAllBtn.position ( 250, 17 );
  seeAllBtn.mousePressed ( seeAllFunc );
  seeAllBtn.id ( "seeAllBtn" );
  seeAllBtn.addClass ( "seeAllBtn" );

  pickAirQualityLabel = createElement('p', 'Pick AQI category: ');
  pickAirQualityLabel.position ( 50, 50 );
  pickAirQualityLabel.addClass ( "labels" );

  selectAirQuality = createSelect();
  selectAirQuality.position ( 160, 60 );
  selectAirQuality.option ( "All", 0 );
  selectAirQuality.option ( "Good", 1 );
  selectAirQuality.option ( "Moderate", 2 );
  selectAirQuality.option ( "Unhealthy for sensitive groups", 3 );
  selectAirQuality.option ( "Unhealthy", 4 );
  selectAirQuality.option ( "Very unhealthy", 5 );
  selectAirQuality.option ( "Hazardous", 6 );

  cityInputLabel = createElement('p', 'View AQI in a city: ');
  cityInputLabel.position ( 50, 80 );
  cityInputLabel.addClass ( "labels" );

  cityInput = createInput ('');
  cityInput.position ( 160, 90 );
  cityInput.input ( getCity );
}

// called when input is changed
function getCity () {

  request = baseUrl + "/feed/" + cityInput.value() + "/?token=" + token;
  loadJSON ( request, getCityInfo );
}

// get data about the city in the input
function getCityInfo ( data ) {

  if ( data.status == "ok" ) {

    clear();

    newCity = new Point ( data.data.city.name, data.data.city.geo[0], data.data.city.geo[1], parseInt ( data.data.aqi ) );
    newCity.setSearched();
    newCity.putOnMap ();
  }

  else newCity = 0;
}

// flip seeAll, show all points on the map
function seeAllFunc () {

  seeAll = !seeAll;

  if ( seeAll ) document.getElementById ( "seeAllBtn" ).innerHTML = "Go back";

  else document.getElementById ( "seeAllBtn" ).innerHTML = "See all data";
}

function mapMoved () { clear(); }

// draw all points on the map
function draw() {

  clear();

  for ( var i = 0; i < points.length; ++i ) { points[i].putOnMap(); }

  if ( newCity ) newCity.putOnMap();
}

// change status of point if it is clicked
function mousePressed () {

  for ( var i = 0; i < points.length; ++i ) points[i].clicked();
}
