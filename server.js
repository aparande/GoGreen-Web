require('dotenv').config()

var express = require('express');
var http = require('http');
var path = require('path');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var favicon = require('serve-favicon');

var session = require('express-session');

var app = express();

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

var mySQLHost = (app.settings.env == "development") ? process.env.LOCAL_DB_HOST : process.env.DB_HOST;
var mySQLPort = (app.settings.env == "development") ? '' : process.env.DB_PORT;
var mySQLPass = (app.settings.env == "development") ? process.env.LOCAL_DB_PASS : process.env.DB_PASS;


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
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var zip = connection.escape(request.body.zip);
		//var state = con.escape(request.body.state);

		var query = "SELECT e_factor, Subregion FROM EGrid WHERE Zip="+zip+";";
		connection.query(query, function(error, results, fields) {
			connection.release();

			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not find E_Factor because of Error'});
				return
			}

			if (results.length == 0) {
				response.send({status: 'Failed', message: 'Could not find E_Factor because of Error'});
				return
			}

			response.send({
				status:'Success',
				message: "E_Factor retrieved successfully",
				e_factor: results[0].e_factor,
				subregion: results[0].Subregion,
			});
		});
	});
});

app.post('/getFromConsumption', function(request, response) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var type = connection.escape(request.body.type);
		var state = connection.escape(request.body.state);
		var country = connection.escape(request.body.country);

		var query = "SELECT Year, Consumption from Consumption WHERE Type="+type+" AND State="+state+" AND Country="+country+";";
		connection.query(query, function(error, results, fields) {
			connection.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add data'});
			}

			if (results.length == 0) {
				console.log("Couldn't find Consumption for Query: "+type+", "+state+", "+country)
				response.send({
					status: 'Failed',
					message: "Couldn't find Consumption for Query: "+type+", "+state+", "+country
				});
				return;
			}

			response.send({
				status:'Success',
				message: "Consumption retrieved successfully",
				year: results[0].Year,
				value: results[0].Consumption
			});
		});
	});
});

app.post('/logEnergyPoints', function(request, response) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var userId = connection.escape(request.body.id);
		var state = connection.escape(request.body.state);
		var country = connection.escape(request.body.country);
		var city = connection.escape(request.body.city);
		var points = connection.escape(request.body.points);

		var query = "INSERT INTO EnergyPoints (UserId, State, Country, City, Points) VALUES (";
		query += userId+", "+state+", "+country+", "+city+", "+points+");";
		connection.query(query, function(error, results, fields) {
			connection.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add Energy Points'});
			}
			response.send({status:'Success', message: "Energy Points added successfully"});
		});
	});
});

app.post('/updateEnergyPoints', function(request, response) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var userId = connection.escape(request.body.id);
		var points = connection.escape(request.body.points);

		var query = "UPDATE EnergyPoints SET Points="+points+" WHERE UserId="+userId+";";
		connection.query(query, function(error, results, fields) {
			connection.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not update Energy points'});
			}
			response.send({status:'Success', message: "Energy points successfully updated"});
		});
	});
});

app.post('/getCityRank', function(request, response) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var userId = connection.escape(request.body.id)
		var city = connection.escape(request.body.city)
		var state = connection.escape(request.body.state)
		var country = connection.escape(request.body.country)

		var query = "SELECT rank FROM (SELECT @rank:=@rank+1 as rank, Points, UserId FROM EnergyPoints, (SELECT @rank:=0) r WHERE City=";
		query += city + " AND State="+state+" AND Country="+country+" ORDER BY POINTS DESC) t WHERE UserId="+userId+";";
		query += "SELECT COUNT(UserId) as Count FROM EnergyPoints WHERE City="+city+" AND State="+state+" AND Country="+country+";";

		connection.query(query, function(error, results, fields) {
			connection.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add data'});
			}
			if (results[0].length == 0) {
				response.send({
					"status":"Failure",
					"message":"Can't get rank because user hasnt logged energy points"
				});
				return;
			}

			response.send({
				"status":"Success",
				"message":"successfully retrieved rank",
				"Rank":results[0][0].rank,
				"Count":results[1][0].Count
			});
		})
	});
});

app.post('/getStateRank', function(request, response) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var userId = connection.escape(request.body.id)
		var state = connection.escape(request.body.state)
		var country = connection.escape(request.body.country)

		var query = "SELECT rank FROM (SELECT @rank:=@rank+1 as rank, Points, UserId FROM EnergyPoints, (SELECT @rank:=0) r WHERE State=";
		query += state+" AND Country="+country+" ORDER BY POINTS DESC) t WHERE UserId="+userId+";";
		query += "SELECT COUNT(UserId) as Count FROM EnergyPoints WHERE State="+state+" AND Country="+country+";";

		connection.query(query, function(error, results, fields) {
			connection.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add data'});
			}

			if (results[0].length == 0) {
				response.send({
					"status":"Failure",
					"message":"Can't get rank because user hasnt logged energy points"
				});
				return;
			}
			response.send({
				"status":"Success",
				"message":"successfully retrieved rank",
				"Rank":results[0][0].rank,
				"Count":results[1][0].Count
			});
		})
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
	console.log('Express server listening on port %d in %s mode', this.address().port, app.settings.env);
});
