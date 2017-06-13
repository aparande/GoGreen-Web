require('dotenv').config()

var express = require('express');
var http = require('http');
var path = require('path');
var mysql = require('mysql');

var session = require('express-session');

var app = express();

app.use(express.static(__dirname + '/public'));
app.use("/img", express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/public'));
app.use("/js", express.static(__dirname + '/public'));
app.use("/lib", express.static(__dirname + '/public'));

var dbCreds = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
};


app.get('/input', function(request, response) {
    var con = mysql.createConnection(dbCreds);

    con.connect(function(err) {
	if (err) throw err;
	console.log("Connected!");
    });
});

app.get('/', function(request, response) {
	response.sendFile('index.html', {root:path.join(__dirname, 'public')});
});

app.get('*', function(request, response) {
	response.sendFile('error404.html', {root:path.join(__dirname, 'public')});
});

app.listen(8000, () => console.log('Server running on 8080'));
