const http = require('http');

var express = require("express");
var app = express();


// var shaders = require(".publ/utils.js");
// var shaders = require("./coords.js");
// var shaders = require("./shaders.js");
// var shaders = require("./script.js");

 app.use(express.static('public'))

//define the route for "/"
app.get("/", function (request, response){
 //show this file when the "/" is requested
 response.sendFile(__dirname+"/public/index.html");
});

 //start the server
app.listen(8080);

console.log("RUNNING! listening on 8080")