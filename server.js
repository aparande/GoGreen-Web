require('dotenv').config()

var express = require('express');
var http = require('http');
var path = require('path');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var favicon = require('serve-favicon');
var session = require('express-session');

var app = module.exports = express();

//This has to go here because it depends on the app defined above
var factors = require("./factors");
var user = require("./user");

app.use(favicon(__dirname+'/public/img/favicon.ico'));

app.use(bodyParser.urlencoded({
	extended:true
}));

app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));
app.use("/img", express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/public'));
app.use("/js", express.static(__dirname + '/public'));
app.use("/lib", express.static(__dirname + '/public'));

var mySQLHost = (process.env.MODE == "development") ? process.env.LOCAL_DB_HOST : process.env.DB_HOST;
var mySQLPort = (process.env.MODE == "development") ? '' : process.env.DB_PORT;
var mySQLPass = (process.env.MODE == "development") ? process.env.LOCAL_DB_PASS : process.env.DB_PASS;


var dbCreds = {
	host: mySQLHost,
	port: mySQLPort,
	user: process.env.DB_USER,
	password: mySQLPass,
	database: process.env.DB_NAME,
	multipleStatements: true,
	connectionLimit:50
};

var pool = mysql.createPool(dbCreds);

app.post('/input', function(request, response) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var profId = connection.escape(request.body.profId);
		var type = connection.escape(request.body.dataType);
		var month = connection.escape(request.body.month);
		var amount = connection.escape(request.body.amount);
		var city = connection.escape(request.body.city);
		var state = connection.escape(request.body.state);
		var country = connection.escape(request.body.country);

		var query = "INSERT INTO Locale_Data (ProfId, DataType, Month, Amount, City, State, Country) VALUES (";
		query += profId+", ";
		query += type+", ";
		query += month+", ";
		query += amount+", ";
		query += city+", ";
		query += state+", ";
		query += country+");";

		connection.query(query, function(error, results, fields) {
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message:'Could not save data'});
			}
			connection.release();
			response.send({status: 'Success', message: "Data saved successfully"});
		});
	})
});

app.post('/updateDataPoint', function(request, response) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var profId = connection.escape(request.body.profId);
		var type = connection.escape(request.body.dataType);
		var month = connection.escape(request.body.month);
		var amount = connection.escape(request.body.amount);

		var query = "UPDATE Locale_Data SET Amount = "+amount+" WHERE ProfId = "+profId+" AND DataType = "+type+" AND Month = "+month+";";

		connection.query(query, function(error, results, fields) {
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message:'Could not update data'});
			}
			connection.release()
			response.send({status: 'Success', message: "Data updated successfully"});
		});
	});
});

app.post('/deleteDataPoint', function(request, response) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var profId = connection.escape(request.body.profId);
		var type = connection.escape(request.body.dataType);
		var month = connection.escape(request.body.month);

		var query = "DELETE FROM Locale_Data WHERE ProfId = "+profId+" AND DataType = "+type+" AND Month = "+month+";";
		connection.query(query, function(error, results, fields) {
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not delete data'});
			}
			connection.release()
			response.send({status:'Success', message: "Data deleted successfully"});
		});
	});
});

app.post('/getFromEGrid', function(request, response) {
	var zip = request.body.zip;
	factors.egrid(zip, function(err, values) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully retrieved E_Grid",
			e_factor: values.e_factor,
			subregion: values.subregion
		});
	});
});

app.post('/getFromConsumption', function(request, response) {
	var type = request.body.type;
	var state = request.body.state;
	var country = request.body.country;
	factors.consumption(type, state, country, function(err, values) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully retrieved Consumption",
			Year: values.Year,
			Consumption: values.Consumption
		});
	});
});

app.post('/logEnergyPoints', function(request, response) {
	var userId = request.body.id;
	var state = request.body.state;
	var country = request.body.country;
	var city = request.body.city;
	var points = request.body.points;

	user.logEP(userId, state, country, city, points, function(err) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully Logged Energy Points",
		});
	});
});

app.post('/getCityRank', function(request, response) {
	var userId = request.body.id;
	var city = request.body.city;
	var state = request.body.state;
	var country = request.body.country;

	factors.cityRank(userId, city, state, country, function(err, values) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully retrieved City Rank",
			Rank: values.Rank,
			Count: values.Count
		});
	});
});

app.post('/getStateRank', function(request, response) {
	var userId = request.body.id;
	var state = request.body.state;
	var country = request.body.country;

	factors.stateRank(userId, state, country, function(err, values) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully retrieved State Rank",
			Rank: values.Rank,
			Count: values.Count
		});
	});
});

app.post('/sendEmail', function(request, response) {
	var email = request.body.email
	var subject = request.body.subject

	var message = request.body.message
	var name = request.body.name
	if (name == undefined)
	name = "";
	if (message == undefined)
	message = ""

	var text = "Email: ";
	text += email+"\nName: ";
	text += name+"\nMessage: ";
	text += message;

	var emailHost = process.env.EMAIL_USER;
	var emailPass = process.env.EMAIL_PASS;

	var transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: emailHost,
			pass: emailPass
		}
	});

	var mailOptions = {
		from: emailHost,
		to: emailHost,
		subject: subject,
		text: text
	};

	transporter.sendMail(mailOptions, function(error, info) {
		if (error) {
			console.log(error);

			response.setHeader('Access-Control-Allow-Origin', '*');
			response.send({
				"status":"Error",
				"message":"Email not Sent",
			});
		} else {
			console.log('Email sent: '+info.response);

			response.setHeader('Access-Control-Allow-Origin', '*');
			response.send({
				"status":"Success",
				"message":"Sent email",
			});
		}
	});


})

app.get('/', function(request, response) {
	response.sendFile('index.html', {root:path.join(__dirname, 'public')});
});

app.get('*', function(request, response) {
	response.sendFile('error404.html', {root:path.join(__dirname, 'public')});
});

app.listen(process.env.PORT || 8000, function() {
	console.log('Express server listening on port %d in %s mode', this.address().port, process.env.MODE);
});
