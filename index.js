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
//var mongoDbUrl = 'mongodb://127.0.0.1/busApi';

//listen on port number provided
server.listen(port, (req, res) => {
    console.log(`Server connected on port ${port}`);
});

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

//creating schema for the bus users
var usersSchema = mongoose.Schema({
	username: String,
	userPassword: String
})

//creating schema for admin
var adminSchema = mongoose.Schema({
	adminName: String,
	authCode: String
})

//creating a model for the admin, bus and users schema
var busDetails = mongoose.model("coordinate", busCoordsSchema);
var userDetails = mongoose.model("user", usersSchema);
var adminDetails = mongoose.model("admin", adminSchema);

//use body-parser to serialize and encode the incoming data.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
});


app.get('/', (req,res) => {
	res.send({'success': 'true. this is the index '})
});

//request to log in a user
app.post('/login', (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	var username = req.body.username;
	var password = req.body.password;

	userDetails.find({username: username, userPassword: password}, (error, user) => {
		if (error) {
			var response = {
				'success': false,
				'message': 'Login failed. Check your internet connection'
			} 
			res.send(response);
		} else {
			if (user.length > 0) {
				var response = {
					'success': true,
					'message': 'Login successful'
				} 
				res.send(response);
			} else {
				var response = {
					'success': false,
					'message': 'Wrong username or password. Please try again'
				} 
				res.send(response);
			}
		}
	})
});

//request to sign up a use
app.post('/signup', (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');

	//check if the user already exists
	userDetails.find({username: req.body.username}, (error, user) => {
		//if there is an error, return an error response
		if (error) {
			var response = {
				'success': false,
				'message': 'Could not sign up. Check your internet connection'
			} 
			res.send(response)
		} else {
			//if there is no error, check if the user exists
			//if the user exists, return an error response
			if (user.length > 0) {
				var response = {
					'success': false,
					'message': 'User already exists'
				} 
				res.send(response)
			} else { //else if the user does not exist
				//check if the authcode is correct
				console.log(req.body.authCode)
				adminDetails.find({authCode: req.body.authCode}, (error, admin) => {
					if(error) {
						var response = {
							'success': false,
							'message': 'Could not verify admin. Check your internet connection'
						} 
						res.send(response);
					} else {
						if (admin.length > 0) {
							var user = new userDetails({username: req.body.username, userPassword: req.body.password});
							user.save(error => {
								if (error) {
									var response = {
										'success': false,
										'message': 'Could not sign up. Check your internet connection'
									} 
									res.send(response);
								} else {
									var response = {
										'success': true,
										'message': 'Signup successful'
									} 
									res.send(response);
								}
							})
						} else {
							var response = {
								'success': false,
								'message': 'Authentication failed. Wrong admin auth code.'
							} 
							res.send(response);
						}
					}
				})
			}
			
		}
	})
});

//request to check admin authentication
app.post('/authAdmin', (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	var authCode = req.body.authCode;

	adminDetails.find({authCode: authCode}, (error, admin) => {
		if (error) {
			var response = {
				'success': false,
				'message': 'Could not authenticate admin. Check your internet connection'
			}
			res.send(response);
		} else {
			if (admin.length > 0) {
				var response = {
					'success': true,
					'message': 'Admin authentication successful'
				}
				res.send(response);
			} else {
				var response = {
					'success': false,
					'message': 'Wrong admin auth code'
				}
				res.send(response);
			}
		}
	})
})

//when a post request is made to insert coordinates into the database
app.get('/insertCoordinates', (req,res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	//update the database details where the bus name is the provided bus name
	busDetails.update({busName: req.query.busName}, {$set: {'lon': req.query.lon, 'lat': req.query.lat, time_stamp: Date.now()}} , (error,res) => {
		if(error) {
			console.log(error)
		} else {
			console.log('data updated')
		}
	});
	res.send({'success':'success from sending coords...'})
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