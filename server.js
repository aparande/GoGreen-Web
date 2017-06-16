require('dotenv').config()

var express = require('express');
var http = require('http');
var path = require('path');
var mysql = require('mysql');
var bodyParser = require('body-parser');

var session = require('express-session');

var app = express();

app.use(bodyParser.urlencoded({
	extended:true
}));

app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));
app.use("/img", express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/public'));
app.use("/js", express.static(__dirname + '/public'));
app.use("/lib", express.static(__dirname + '/public'));

var mySQLHost = process.env.DB_HOST || '127.0.0.1';
var mySQLPort = process.env.DB_PORT || '';

var dbCreds = {
    host: mySQLHost,
    port: mySQLPort,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};


app.post('/input', function(request, response) {
    var con = mysql.createConnection(dbCreds);
    con.connect(function(err) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var profId = con.escape(request.body.profId);
		var type = con.escape(request.body.dataType);
		var month = con.escape(request.body.month);
		var amount = con.escape(request.body.amount);
		var city = con.escape(request.body.city);
		var state = con.escape(request.body.state);
		var country = con.escape(request.body.country);

		var query = "INSERT INTO Locale_Data (ProfId, DataType, Month, Amount, City, State, Country) VALUES (";
		query += profId+", ";
		query += type+", ";
		query += month+", ";
		query += amount+", ";
		query += city+", ";
		query += state+", ";
		query += country+");";

		con.query(query, function(error, results, fields) {
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message:'Could not save data'});
			}

			response.send({status: 'Success', message: "Data saved successfully"});
		});
    });
});

app.post('/updateDataPoint', function(request, response) {
    var con = mysql.createConnection(dbCreds);
    con.connect(function(err) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var profId = con.escape(request.body.profId);
		var type = con.escape(request.body.dataType);
		var month = con.escape(request.body.month);
		var amount = con.escape(request.body.amount);

		var query = "UPDATE Locale_Data SET Amount = "+amount+" WHERE ProfId = "+profId+" AND DataType = "+type+" AND Month = "+month+";";

		con.query(query, function(error, results, fields) {
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message:'Could not update data'});
			}

			response.send({status: 'Success', message: "Data updated successfully"});
		});
    });
});

app.post('/deleteDataPoint', function(request, response) {
	var con = mysql.createConnection(dbCreds);
	con.connect(function(err) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var profId = con.escape(request.body.profId);
		var type = con.escape(request.body.dataType);
		var month = con.escape(request.body.month);

		var query = "DELETE FROM Locale_Data WHERE ProfId = "+profId+" AND DataType = "+type+" AND Month = "+month+";";
		con.query(query, function(error, results, fields) {
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not delete data'});
			}

			response.send({status:'Success', message: "Data deleted successfully"});
		});
	});
});

app.get('/', function(request, response) {
	response.sendFile('index.html', {root:path.join(__dirname, 'public')});
});

app.get('*', function(request, response) {
	response.sendFile('error404.html', {root:path.join(__dirname, 'public')});
});

app.listen(8000, () => console.log('Server running on 8000'));
