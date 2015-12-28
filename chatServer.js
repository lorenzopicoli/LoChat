var express = require("express");
var http = require('http')
var app = express();
var server = http.createServer(app).listen(3001);
var io = require('socket.io').listen(server);

var connectedIPs = [];
var messageCount = 0;

//Utility
function getTimeNow(){
	var now = new Date();
	var hour = now.getHours();
	var minutes = now.getMinutes();
	function pad(n) {
         return (n < 10) ? '0' + n : n;
    }

    return "<i>" + pad(hour).toString() + ":" + pad(minutes).toString() + "</i>";
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

function log(message, clientIp){
	console.log(`${getTimeNow()} - ${clientIp} - ${message}`);
}

//Socket IO
 io.on('connection', function (socket) {
  	var clientIp = socket.request.connection.remoteAddress;
  	log("Attempting to connect", clientIp);

  	if(connectedIPs.indexOf(clientIp) != -1){
  		socket.emit("refused", "You are already connected to LoChat using this computer.");
  		log("Connection refused. Already connected", clientIp);
  		socket.disconnect();
  	}else{

  		log("Connection accepted", clientIp);
  		connectedIPs.push(clientIp);

  		//New Message
		socket.on('newMessage', function(message) {
			
			if(message.toLowerCase() === "exit"){
				socket.emit("message", `${getTimeNow()} - LoChat: You are now disconnected. To connect again type: 'connect'.`);
				socket.disconnect();
			}else{
				messageCount++;
				socket.broadcast.emit("message", `${getTimeNow()} - ${message}`);
				socket.emit("message", `${getTimeNow()} - ${message}`);
				socket.emit("statusUpdate", `Messages sent: ${messageCount}<br>IPs connected: ${connectedIPs.length}`);
				log(`STATUS UPDATE - Messages sent: ${messageCount}. IPs connected: ${connectedIPs.length}`, clientIp);
			}
			log(`NEW MESSAGE - ${message}`, clientIp);
		});


		//Disconnect
		socket.on("disconnect",function(){
			log("Disconnecting...", clientIp);
			connectedIPs.splice(connectedIPs.indexOf(clientIp), 1);
		});

		//Permission
		socket.on("permission-asked",function(){
			log("User asked for notification permission", clientIp);
		});

		socket.on("permission-accept", function(){
			log("User accepted the notification permission", clientIp);
		});

		socket.on("permission-refused", function(){
			log("User refused the notification permission", clientIp);
		});

  	}

	socket.emit("statusUpdate", `Messages sent: ${messageCount}<br>IPs connected: ${connectedIPs.length}`);
	log(`STATUS UPDATE - Messages sent: ${messageCount}. IPs connected: ${connectedIPs.length}`, clientIp);
	socket.emit("message", `${getTimeNow()} - LoChat: You are now connected to LoChat`);
	socket.emit("message", `${getTimeNow()} - LoChat: Welcome, new user. You can type 'exit' to leave.`);
});

log("LoChat running on port 3001.");