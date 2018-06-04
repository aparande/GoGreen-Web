require('dotenv').config()

var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var nodemailer = require('nodemailer');
var favicon = require('serve-favicon');
var session = require('client-sessions');
var user = require("./user");

var app = module.exports = express();

app.use(favicon(__dirname+'/public/img/favicon.ico'));

app.use(bodyParser.urlencoded({
	extended:true
}));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(session({
	cookieName: 'greenSession',
	secret: "I Heart GoGreen",
	duration: 24 * 60 * 60 * 1000,
}));

app.use("/api", require('./apiRoutes'));

app.use(express.static(__dirname + '/public'));
app.use("/img", express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/public'));
app.use("/js", express.static(__dirname + '/public'));
app.use("/lib", express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

//Legacy functions for backward compatability
var mysql = require('mysql');
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
		connectionLimit: 10
};

var pool = mysql.createPool(dbCreds);

app.post('/input', function(request, response) {
	pool.getConnection(function(err, con) {
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
			con.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message:'Could not save data'});
				return
			}

			response.send({status: 'Success', message: "Data saved successfully"});
		});
	});
});

app.post('/updateDataPoint', function(request, response) {
	pool.getConnection(function(err, con) {
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
			con.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message:'Could not update data'});
			}

			response.send({status: 'Success', message: "Data updated successfully"});
		});
	})
});

app.post('/deleteDataPoint', function(request, response) {
	pool.getConnection(function(err, con) {
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
			con.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not delete data'});
			}

			response.send({status:'Success', message: "Data deleted successfully"});
		});
	});
});

app.post('/getFromEGrid', function(request, response) {
	pool.getConnection(function(err, con) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var zip = con.escape(request.body.zip);

		var query = "SELECT e_factor, Subregion FROM EGrid WHERE Zip="+zip+";";
		con.query(query, function(error, results, fields) {
			con.release();
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
	pool.getConnection(function(err, con) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var type = con.escape(request.body.type);
		var state = con.escape(request.body.state);
		var country = con.escape(request.body.country);

		var query = "SELECT Year, Consumption from Consumption WHERE Type="+type+" AND State="+state+" AND Country="+country+";";
		con.query(query, function(error, results, fields) {
			con.release();
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
	pool.getConnection(function(err, con) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var userId = con.escape(request.body.id);
		var state = con.escape(request.body.state);
		var country = con.escape(request.body.country);
		var city = con.escape(request.body.city);
		var points = con.escape(request.body.points);

		var query = "INSERT INTO EnergyPoints (UserId, State, Country, City, Points) VALUES (";
		query += userId+", "+state+", "+country+", "+city+", "+points+");";
		con.query(query, function(error, results, fields) {
			con.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add Energy Points'});
			}

			response.send({status:'Success', message: "Energy Points added successfully"});
		});
	});
});

app.post('/updateEnergyPoints', function(request, response) {
	pool.getConnection(function(err, con) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var userId = con.escape(request.body.id);
		var points = con.escape(request.body.points);

		var query = "UPDATE EnergyPoints SET Points="+points+" WHERE UserId="+userId+";";
		con.query(query, function(error, results, fields) {
			con.release();
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not update Energy points'});
			}

			response.send({status:'Success', message: "Energy points successfully updated"});
		});
	});
});

app.post('/getCityRank', function(request, response) {
	pool.getConnection(function(err, con) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var userId = con.escape(request.body.id)
		var city = con.escape(request.body.city)
		var state = con.escape(request.body.state)
		var country = con.escape(request.body.country)

		var query = "SELECT rank FROM (SELECT @rank:=@rank+1 as rank, Points, UserId FROM EnergyPoints, (SELECT @rank:=0) r WHERE City=";
		query += city + " AND State="+state+" AND Country="+country+" ORDER BY POINTS DESC) t WHERE UserId="+userId+";";
		query += "SELECT COUNT(UserId) as Count FROM EnergyPoints WHERE City="+city+" AND State="+state+" AND Country="+country+";";

		con.query(query, function(error, results, fields) {
			con.release();
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
	pool.getConnection(function(err, con) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}

		var userId = con.escape(request.body.id)
		var state = con.escape(request.body.state)
		var country = con.escape(request.body.country)

		var query = "SELECT rank FROM (SELECT @rank:=@rank+1 as rank, Points, UserId FROM EnergyPoints, (SELECT @rank:=0) r WHERE State=";
		query += state+" AND Country="+country+" ORDER BY POINTS DESC) t WHERE UserId="+userId+";";
		query += "SELECT COUNT(UserId) as Count FROM EnergyPoints WHERE State="+state+" AND Country="+country+";";

		con.query(query, function(error, results, fields) {
			con.release();
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
		});
	});
});
//End legacy functions

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

	sendEmail(process.env.EMAIL_USER, subject, text, function(results) {
		response.setHeader('Access-Control-Allow-Origin', '*');
		response.send(results);
	})
});

app.get('/reset', function(request, response) {
	var isRequesting = (request.greenSession.userId == undefined);
	response.render('pages/resetAccount', {
		"request": isRequesting
	});
})

app.post('/reset', function(request, response) {
	if (request.greenSession.userId == undefined) {
		var email = request.body.email;
		user.reqReset(email, function(error, results) {
			if (error) {
				response.send({
					Success: false,
					"status": "Error",
					"message": error.Message
				});
				return;
			}

			var name = results.name;
			var newPassword = results.password;

			var subject = "Password Reset Requested";
			var message = `Dear, ${name}.\n\nWe recently received a password reset request for your GoGreen account. \
In order to reset your password, please login to GoGreen with the provided temporary password to begin the \
reset process. If you did not request a password reset, then we recommend you still change your password to increase \
the security of your account.\n\nTemporary Password: ${newPassword}\nReset Link: www.gogreenapp.org/login\n\nIf you have any questions, \
please let us know.\n\nBest,\nThe GoGreen Team`;
			sendEmail(email, subject, message, function(results) {
				response.setHeader('Access-Control-Allow-Origin', '*');
				response.send(results);
			})
		})
	} else {
		var userId = request.greenSession.userId;
		var newPass = request.body.newPass;
		user.resetPass(userId, newPass, function(error) {
			if (error) {
				response.send({
					Success: false,
					"status": "Error",
					"message": error.message
				});
				return;
			}

			response.send({
				Success: true,
				status: "Success",
				message: "Password reset successfully"
			})
		})
	}
});

app.get('/login', function(request, response) {
	if (request.greenSession.userId != undefined) {
		request.greenSession.reset();
		response.redirect('/');
	} else
		response.render('pages/account');
});

app.get('/', function(request, response) {
	response.sendFile('index.html', {root:path.join(__dirname, 'public')});
});

app.get('*', function(request, response) {
	response.sendFile('error404.html', {root:path.join(__dirname, 'public')});
});

app.listen(process.env.PORT || 8000, function() {
	if (process.env.MODE != "development") {
		console.warn('WARNING: Server is running in PRODUCTION mode. Set process.env.MODE=development to switch to development')
	}
	console.log('Express server listening on port %d in %s mode', this.address().port, process.env.MODE);
});
