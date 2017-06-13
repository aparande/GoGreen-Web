require('dotenv').config()

var express = require('express');
var http = require('http');
var path = require('path');
var mysql = require('mysql');

var session = require('express-session');

var app = express();

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

app.get('*', function(request, response) {
	response.sendFile('index.html', {root:path.join(__dirname, 'public')});
});

app.listen(8080, () => console.log('Server running on 8080'));
