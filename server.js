require('dotenv').config()

var express = require('express');
var http = require('http');
var path = require('path');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');

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
    database: process.env.DB_NAME,
    multipleStatements: true
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
			con.end()
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
			con.end()
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
			con.end()
			response.send({status:'Success', message: "Data deleted successfully"});
		});
	});
});

app.post('/getFromEGrid', function(request, response) {
	var con = mysql.createConnection(dbCreds);
	con.connect(function(err) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var zip = con.escape(request.body.zip);
		//var state = con.escape(request.body.state);

		var query = "SELECT e_factor, Subregion FROM EGrid WHERE Zip="+zip+";";
		con.query(query, function(error, results, fields) {
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not find E_Factor because of Error'});
				return
			}

			if (results.length == 0) {
				response.send({status: 'Failed', message: 'Could not find E_Factor because of Error'});
				return
			}

			con.end()
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
	var con = mysql.createConnection(dbCreds);
	con.connect(function(err) {
		if (err) {
			con.end()
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var type = con.escape(request.body.type);
		var state = con.escape(request.body.state);
		var country = con.escape(request.body.country);

		var query = "SELECT Year, Consumption from Consumption WHERE Type="+type+" AND State="+state+" AND Country="+country+";";
		con.query(query, function(error, results, fields) {
			if (error) {
				con.end()
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add data'});
			}
			if (results.length == 0) {
				con.end()
				console.log("Couldn't find Consumption for Query: "+type+", "+state+", "+country)
				response.send({
					status: 'Failed',
					message: "Couldn't find Consumption for Query: "+type+", "+state+", "+country
				});
				return;
			}

			con.end()
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
	var con = mysql.createConnection(dbCreds);
	con.connect(function(err) {
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
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add Energy Points'});
			}
			con.end()
			response.send({status:'Success', message: "Energy Points added successfully"});
		});
	});
});

app.post('/updateEnergyPoints', function(request, response) {
	var con = mysql.createConnection(dbCreds);
	con.connect(function(err) {
		if (err) {
			console.log(err.message);
			response.send({status: 'Failure', message:'Failed to connect to SQL Server'});
			return;
		}
		var userId = con.escape(request.body.id);
		var points = con.escape(request.body.points);

		var query = "UPDATE EnergyPoints SET Points="+points+" WHERE UserId="+userId+";";
		con.query(query, function(error, results, fields) {
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not update Energy points'});
			}
			con.end()
			response.send({status:'Success', message: "Energy points successfully updated"});
		});
	});
});

app.post('/getCityRank', function(request, response) {
	var con = mysql.createConnection(dbCreds);
	con.connect(function(err) {
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
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add data'});
			}
			con.end();
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
	var con = mysql.createConnection(dbCreds);
	con.connect(function(err) {
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
			if (error) {
				console.log(error.message);
				response.send({status: 'Failed', message: 'Could not add data'});
			}
			con.end();

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

	var transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: 'gogreenappinfo@gmail.com',
			pass: '8G87!HTOQvr7@rSh'
		}
	});

	var mailOptions = {
		from: 'gogreenappinfo@gmail.com',
		to: 'gogreenappinfo@gmail.com',
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

app.listen(8000, () => console.log('Server running on 8000'));
