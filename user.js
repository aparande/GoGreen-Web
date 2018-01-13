require('dotenv').config()
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
	connectionLimit:10
};

var pool = mysql.createPool(dbCreds);
var errors = require("./errors.json");

module.exports = {
  logEP: function(id, state, country, city, points, callback) {
    var data = {
      "id":id,
      "state":state,
      "country":country,
      "city":city,
      "points":points
    }

    logEnergyPoints(data, function(err) {
      if (err) {
        callback({ ErrorType: err.ErrorType, Message: "Could not Log Energy Points for User: "+id});
        return
      }
      callback(undefined);
    })
  },

	fetch: function(userId, dataType, callback) {
		var data = {
      "id":userId,
			"type": dataType
    }

		fetchData(data, function(err, results) {
			if (err) {
				if (err.ErrorType == errors.ZeroResults) {
					callback({ ErrorType: err.ErrorType, Message: "Profile not found"}, undefined);
				} else {
					callback({ ErrorType: err.ErrorType, Message: "Error in fetching user data"}, undefined);
				}

        return
      }
      callback(undefined, results);
		});
	}
}

function logEnergyPoints(data, callback) {
  pool.getConnection(function(err, connection) {
		if (err) {
      console.log(err.message);
      callback(errors.ConnectionFailure);
			return;
		}
		var userId = connection.escape(data.id);
		var state = connection.escape(data.state);
		var country = connection.escape(data.country);
		var city = connection.escape(data.city);
		var points = connection.escape(data.points);

		var query = "INSERT INTO EnergyPoints (UserId, State, Country, City, Points) VALUES (";
		query += userId+", "+state+", "+country+", "+city+", "+points+") ON DUPLICATE KEY UPDATE Points = VALUES(Points);";
		connection.query(query, function(error, results, fields) {
			connection.release();
			if (error) {
        console.log(error.message);
        callback(errors.QueryError);
				return
			}

			callback(undefined);
		});
	});
}

function fetchData(data, callback) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			callback(errors.ConnectionFailure, undefined);
			return;
		}

		var userId = connection.escape(data.id);
		var dataType = connection.escape(data.type);

		var query = "SELECT DataType, Month, Amount FROM Locale_Data WHERE ProfId="+userId+" AND DataType="+dataType+";";
		connection.query(query, function(error, results, fields) {
			connection.release();
			if (error) {
				console.log(error.message);
        callback(errors.QueryError, undefined);
				return
			}

			if (results.length == 0) {
				callback(errors.ZeroResults, undefined);
				return
			}

      callback(undefined, results);
		});
	});
}
