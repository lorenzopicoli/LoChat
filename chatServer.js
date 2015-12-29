var express = require("express");
var http = require('http')
var app = express();
var server = http.createServer(app).listen(3000);
var io = require('socket.io').listen(server);

var connectedUsers = [];
var messageCount = 0;

//Utility
function getTimeNow(){
	var now = new Date();
	var hour = now.getHours();
	var minutes = now.getMinutes();
	function pad(n) {
         return (n < 10) ? '0' + n : n;
    }

    return pad(hour).toString() + ":" + pad(minutes).toString();
}

//Express
app.use(function(req, res, next){
	console.log(`${getTimeNow()} - ${req.ip} - ${req.method} request for ${req.url}`);
	next();
});

app.use(express.static("./public"));

app.get("/*", function(req, res){
	res.send("Nope, nope, NOPE! This page doesn't exit!!");
});

function log(message, user){
	if ( user === null ||  user === undefined){
		console.log(`${getTimeNow()} - ${message}`);
	}else{
		console.log(`${getTimeNow()} - ${user.ip} - ${user.name} - ${message}`);

	}
}

function getUserByIp(clientIp){
	var r = null;
  	connectedUsers.forEach(function(user){
  		if(user.ip === clientIp){
  			r = user;
  		}
  	});
  	return r;
}

function disconnectUser(clientIp){
	connectedUsers = connectedUsers.filter(function(user){
  						return (user.ip !== clientIp);
  					 });
}

//Socket IO
 io.on('connection', function (socket) {
  	var clientIp = socket.request.connection.remoteAddress;
  	var clientName = "Guest" + connectedUsers.length;
  	var newUser = {name: clientName, ip: clientIp};
  	var alreadyConnected = getUserByIp(clientIp);

  	log("Attempting to connect", clientIp);
  	console.log(connectedUsers);
  	if(alreadyConnected !== null){
  		socket.emit("refused", "You are already connected to LoChat using this computer.");
  		log("Connection refused. Already connected", alreadyConnected);
  		socket.disconnect();
  	}else{

  		log("Connection accepted", newUser);
  		connectedUsers.push(newUser);

  		//New Message
		socket.on('newMessage', function(message) {
			var newMessage = "";

			if(message.toLowerCase() === "/exit"){
				newMessage = {time: getTimeNow(), text: "You are now disconnected. To connect again type: '/connect'", user: {name: "LoChat", ip: 0}};
				socket.emit("message", newMessage);
				disconnectUser(clientIp);
				socket.emit("statusUpdate", messageCount, connectedUsers);
				socket.disconnect();

			}else if(message.slice(0, 9) === "/username"){
				  	connectedUsers.forEach(function(user){
  						if(user.ip === clientIp){
  							user.name = message.slice(10, message.length);
  						}
  					});
			}else{
				newMessage = {time: getTimeNow(), text: message, user: getUserByIp(clientIp)};
				messageCount++;
				socket.broadcast.emit("message", newMessage);
				socket.emit("message", newMessage);
			}

			socket.emit("statusUpdate", messageCount, connectedUsers);
			log(`NEW MESSAGE - ${message}`,  getUserByIp(clientIp));
			log(`STATUS UPDATE - Messages sent: ${messageCount}. IPs connected: ${connectedUsers.length}`,  getUserByIp(clientIp));
		});


		//Disconnect
		socket.on("disconnect",function(){
			log("Disconnecting...",  getUserByIp(clientIp));
			disconnectUser(clientIp);
			socket.emit("statusUpdate", messageCount, connectedUsers);
		});

		//Permission
		socket.on("permission-asked",function(){
			log("User asked for notification permission",  getUserByIp(clientIp));
		});

		socket.on("permission-accept", function(){
			log("User accepted the notification permission",  getUserByIp(clientIp));
		});

		socket.on("permission-refused", function(){
			log("User refused the notification permission",  getUserByIp(clientIp));
		});

  	}

	socket.emit("statusUpdate", messageCount, connectedUsers);
	log(`STATUS UPDATE - Messages sent: ${messageCount}. IPs connected: ${connectedUsers.length}`,  getUserByIp(clientIp));
	socket.emit("message", {time: getTimeNow(), text: "You are now connected to LoChat", user: {name: "LoChat", ip: "0"}});
	socket.emit("message", {time: getTimeNow(), text: "Welcome, new user. You can type '/exit' to leave.", user: {name: "LoChat", ip: 0}});
	socket.emit("message", {time: getTimeNow(), text: "You can also type '/username \"your-username-here\"' to change your username", user: {name: "LoChat", ip: 0}});

});

log("LoChat running on port 3000.");