
// base url for getting data
var baseUrl = "https://api.waqi.info";
// token for aqi data
var token = "ceb3e4043ac7f55d252a0114f6a74d7bfdbd80e0";
// token for mapbox map
var mapboxToken = "pk.eyJ1IjoibWFyaWphdHJpZmtvdmljIiwiYSI6ImNqd3djNjQyejAybmw0NG93emoxeGRmZWYifQ.Xh54TQijAjg1CDy6pvBInw";

// request string for getting json
var request;
// data from json
var data;
// arrray that stores all the points gathered from request
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

// lat and lng of point converted to positions on the screen
var newX;
var newY;

var pos;

class Point {

  constructor ( name, lat, lng, aqi ) {

    this.name = name;

    this.lat = lat;
    this.lng = lng;

    this.aqi = parseInt(aqi);
    // 6 categories, used for viewing only specific air quality groups
    this.airQualityVal = 0;

    this.reds = 0;
    this.greens = 0;
    this.blues = 0;

    // set color of point based on aqi
    if ( this.aqi <= 50 ) {
      this.airQualityVal = 1;
      this.greens = 239;
      this.blues = 32;
    }
    else if ( this.aqi <= 100) {
      this.airQualityVal = 2;
      this.reds = 239;
      this.greens = 239;
    }
    else if ( this.aqi <= 150 ) {
      this.airQualityVal = 3;
      this.reds = 255;
      this.greens = 179;
    }
    else if ( this.aqi <= 200 ) {
      this.airQualityVal = 4;
      this.reds = 255;
      this.greens = 68;
    }
    else if ( this.aqi <= 300 ) {
      this.airQualityVal = 5;
      this.reds = 162;
      this.blues = 255;
    }
    else {
      this.airQualityVal = 6;
      this.reds = 138;
      this.greens = 2;
      this.blues = 21;
    }

    // true if point was clicked ( larger circle with info )
    this.isClicked = false;
    // true if this is the point created by using input ( larger circle with info )
    this.search = false;
  }

  // if point was clicked, flip isClicked
  clicked () {

    pos = map.latLngToPixel( this.lat, this.lng );

    // change so its easier to close

    if ( dist ( pos.x, pos.y, mouseX, mouseY ) < 10 ) {

      // flip icClicked if closing or if point in seelcted category
      // is point clicked and category changed the point will still be displayed
      if ( selectAirQuality.value() == 0 || selectAirQuality.value() == this.airQualityVal || this.isClicked ) this.isClicked = !this.isClicked;

      mapMoved();
    }
  }

  // if isClicked or searched or in ( seeAll mode and hovered ), will display larger circle with info
  putInfoOnMap() {

    fill ( this.reds, this.greens, this.blues, 150 );
    circle( newX, newY, map.zoom() * 40 );
    textAlign ( CENTER );
    textStyle ( BOLD );
    if ( this.airQualityVal == 5 || this.airQualityVal == 6 ) {
      fill ( 255 );
    }
    else {
      fill ( 0 );
    }
    textSize ( ( map.zoom() * 54 ) / this.name.length );
    text ( this.name, newX - map.zoom() * 27, newY - map.zoom() * 10, map.zoom() * 54, map.zoom() * 20 );
    textSize ( map.zoom() * 10 );
    text ( this.aqi, newX, newY + map.zoom() * 10 );

  }

  // called in draw, puts point on map if it is within bounds
  putOnMap () {

    // don't draw point if can't be visible on map
    if ( !map.map.getBounds().contains ( [ this.lat, this.lng ] ) ) return;

    newX = map.latLngToPixel ( this.lat, this.lng ).x;
    newY = map.latLngToPixel ( this.lat, this.lng ).y;

    noStroke();

    // if the point is searched or clicked it will appear on the map
    // regardless of the seeAll state and 
    // regardless of whether an air quality category is specified
    if ( this.searched || this.isClicked ) { this.putInfoOnMap(); }

    // point will not be displayed if it doesn't fall into the selected category
    else if ( ! ( selectAirQuality.value() == 0 || selectAirQuality.value() == this.airQualityVal ) ) return;
    
    // if in seeAll state point might be displayed
    // or if mouse close to point, point might be displayed
    else if ( seeAll || dist ( newX, newY, mouseX, mouseY ) < 50 ) {

      // if in seeAll state and mouse close to point display larger circle with info
      if ( seeAll && dist ( newX, newY, mouseX, mouseY ) < 5 ) this.putInfoOnMap();

      // display small circle
      else {

          fill ( this.reds, this.greens, this.blues, 150 );
          circle( newX, newY, map.zoom() * 2.5 );
      }
    }
  }
};

function preload () {

  // get info from city
  //request = baseUrl + "/feed/london/?token=" + token;

  // all stations in the rectangle defined by given lat and lon
  request = baseUrl + "/map/bounds/?latlng=-90,-180,90,180&token=" + token;
  
  // nearest station
  //request = baseUrl + "/feed/geo:70;70/?token=" + token;
  loadJSON ( request, printJ );
  //loadJSON( someRequest + token2, printJ );
}

function printJ ( data ) {

  if ( data.status == "ok" ) {

    for ( var i = 0; i < data.data.length; ++i ) {
      
      points.push( new Point( data.data[i].station.name, data.data[i].lat, data.data[i].lon, data.data[i].aqi ) );
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


function getCity () {

  request = baseUrl + "/feed/" + cityInput.value() + "/?token=" + token;
  loadJSON ( request, getCityInfo );
}

function getCityInfo ( data ) {

  if ( data.status == "ok" ) {

    clear();

    newCity = new Point ( data.data.city.name, data.data.city.geo[0], data.data.city.geo[1], data.data.aqi );
    newCity.searched = true;
    newCity.putOnMap ();
  }

  else newCity = 0;
}

function seeAllFunc () {

  seeAll = !seeAll;

  if ( seeAll ) {

    document.getElementById ( "seeAllBtn" ).innerHTML = "Go back";
  }
  else {

    document.getElementById ( "seeAllBtn" ).innerHTML = "See all data";
  }
}

function mapMoved () { clear(); }

function draw() {

  clear();

  for ( var i = 0; i < points.length; ++i ) { points[i].putOnMap(); }

  if ( newCity ) newCity.putOnMap();
}

function mousePressed () {

  for ( var i = 0; i < points.length; ++i ) {

    points[i].clicked();
  }
}
