var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var server =  require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');
var mongoose = require('mongoose');
var port = process.env.PORT || 3000;
var mongoDbUrl = 'mongodb://busapi:busapi@ds231090.mlab.com:31090/busapi';
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


//listen on port number provided
server.listen(port, (req, res) => {
    console.log(`Server connected on port ${port}`);
});

app.get('/', (req,res) => {
	res.send('Hello world')
})

//when a post request is made to insert coordinates into the database
app.get('/insertCoordinates', (req,res) => {
	//update the database details where the bus name is the provided bus name
	busDetails.update({busName: req.query.busName}, {$set: {'lon': req.query.lon, 'lat': req.query.lat, time_stamp: Date.now()}} , (error,res) => {
		if(error) {
			console.log(error)
		} else {
			console.log('data updated')
		}
	});
});


//socket when the socket is connected
io.sockets.on('connection',(socket) => {
	console.log('client connected...')
	//when a client connects to the app, send them a succes message
	socket.emit('connectionSuccess','Connection successful');

	//when the socket listens to a client making a request to get all coordinates, it must get all the coordinates and send it back to the client, using the 'getAllCoordinatesForClient' method
	socket.on('requestAllCoordinates', (message) => {
		console.log(message)
		getAllCoordinatesForClient();
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

    //when a user is disconnected send them a message
	socket.on('disconnect', () => {
		socket.emit('connectionFailure', 'Connection failed');
	});
	
});


//if there is an error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(err.stack);

});