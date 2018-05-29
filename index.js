/*
	THIS IS THE API FOR THE SHUTTLE TRACKING DEVICES OF THE UNIVERSITY OF CAPE COAST
	@AUTHOR: ENOCH SOWAH
	DATE: 23 FEBRUARY, 2018

	DESCRIPTION: [
		* THIS API USES SOCKET CONNECTION TO COMMUNICATE AND SEND DATA BETWEEN THE APPLICATIONS AND THE SERVER.
		* THE FIRST REQUEST ROUTE WHICH IS THE '/', DIRECTS THE USER THE INDEX PAGE OF THE API
		* THE SECOND REQUEST ROUTE WHICH IS THE 'insertCoordinates', RECIEVES THE COORDINATES FROM THE TRACKING DEVICES AND INSERTS THEM INTO  THE DATABASE
		* THE CLIENT (MOBILE) APPLICATION MAKES SOCKET REQUESTS TO THE SERVE AFTER SOME INTERVALS, AND THE SERVER SENDS THE COORDINATES TO THE CLIENTS REQUESTING THEM.
	]
*/

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var server =  require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');
var mongoose = require('mongoose');
var port = process.env.PORT || 4000;
var mongoDbUrl = 'mongodb://busapi:busapi@ds231090.mlab.com:31090/busapi';

//listen on port number provided
server.listen(port, (req, res) => {
    console.log(`Server connected on port ${port}`);
});

//var mongoDbUrl = 'mongodb://127.0.0.1/busApi';
mongoose.connect(mongoDbUrl, function(error){
	if (error) {
		console.log(error)
	}else{
		console.log('mongodb connected')
	}
});

//creating a schema for the bus coordinates
var busCoordsSchema = mongoose.Schema({
	busName: String,
	lon: String,
	lat: String,
	time_stamp: {type: Date,default: Date.now}
});

//creating a model for the bus schema
var busDetails = mongoose.model("coordinates", busCoordsSchema);

//use body-parser to serialize and encode the incoming data.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.get('/', (req,res) => {
	res.send({'success': 'true'})
})

//when a post request is made to insert coordinates into the database
app.get('/insertCoordinates', (req,res) => {
	//update the database details where the bus name is the provided bus name
	busDetails.update({busName: req.query.busName}, {$set: {'lon': req.query.lon, 'lat': req.query.lat, time_stamp: Date.now()}} , (error,res) => {
		if(error) {
			console.log(error)
		} else {
			console.log('data updated')
			res.send({'success': 'true'})
		}
	});
});


//socket when the socket is connected
io.sockets.on('connection',(socket) => {

	//when the socket listens to a client making a request to get all coordinates, it must get all the coordinates and send it back to the client, using the 'getAllCoordinatesForClient' method
	socket.on('requestAllCoordinates', (message) => {
		getAllCoordinatesForClient();
	})

	socket.on('requestAllCoordinatesUpdate', (message) => {
		getAllCoordinatesUpdatesForClient();
	})

	//a function to get all coordinates to client
	function getAllCoordinatesForClient() {
		busDetails.find({},(error, coords) => {
			if(error) {
				console.log(error)
			} else {
				socket.emit('getAllCoordinates',coords);
			}
		})
	}

	function getAllCoordinatesUpdatesForClient() {
		busDetails.find({},(error, coords) => {
			if(error) {
				console.log(error)
			} else {
				socket.emit('getAllCoordinatesUpdate',coords);
			}
		})
	}
});


//if there is an error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(err.stack);

});