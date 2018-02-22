require('dotenv').config()
var uuid = require('uuid-v4');
var mysql = require('mysql');
var bcrypt = require('bcrypt');

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

	fetch: function(userId, dataType, assoc, callback) {
		var data = {
      "id":userId,
			"type": dataType,
    }

		if (assoc != undefined) {
			data["assoc"] = assoc;
			associatedFetch(data, function(err, results) {
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
		} else {
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
	},

	signup: function(userId, lastName, firstName, email, password, location = undefined, callback) {
		var data = {
			"id":userId, "lastName":lastName, "firstName":firstName, "email":email, "password": password
		}
		if (location != undefined) {
			data["location"] = location;
		}
		signup(data, function(err, results) {
			if (err) {
				callback({ ErrorType: err.ErrorType, Message: "Error signing up user"}, undefined);
        return
      }
      callback(undefined, results.userId);
		});
	},

	login: function(email, password, callback) {
		var data = {"email":email, "password": password};
		login(data, function(err, results) {
			if (err) {
				if (err.ErrorType == errors.ZeroResults) {
					callback({ ErrorType: err.ErrorType, Message: "Email not found"}, undefined);
				} else if (err.ErrorType == errors.PasswordError) {
					callback({ ErrorType: err.ErrorType, Message: "Password incorrect"}, undefined);
				} else {
					callback({ ErrorType: err.ErrorType, Message: "Error in logging in"}, undefined);
				}

        return
      }
			callback(undefined, results);
		});
	},

	delete: function(id, callback) {
    var data = {
      "id":id
    }

    deleteProfData(data, function(err) {
      if (err) {
        callback({ ErrorType: err.ErrorType, Message: "Could not delete User: "+id});
        return
      }
      callback(undefined);
    })
  },
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

//A fetch that returns all associated data with the category such as car specific points or attributes
function associatedFetch(data, callback) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			callback(errors.ConnectionFailure, undefined);
			return;
		}

		var userId = connection.escape(data.id);
		var dataType = data.type;

		dataType += ":";

		if (data.assoc != "") {
			var dataAssociation = data.assoc;
			dataType += dataAssociation+":";
		}
		dataType += "%";

		dataType = connection.escape(dataType);

		var query = `SELECT DataType, Month, Amount FROM Locale_Data WHERE ProfId=${userId} AND DataType LIKE ${dataType};`;
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

function signup(data, callback) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			callback(errors.ConnectionFailure, undefined);
			return;
		}

		var userId = data.id;
		if (userId == undefined) {
			userId = uuid();
		}

		userId = connection.escape(userId);
		var lastName = connection.escape(data.lastName);
		var firstName = connection.escape(data.firstName);
		var email = connection.escape(data.email);
		var city = undefined; var state = undefined; var country = undefined;
		if (data.location !== undefined) {
			city = connection.escape(data.location.city);
			state = connection.escape(data.location.state);
			country = connection.escape(data.location.country);
		}

		var password = connection.escape(data.password);
		bcrypt.hash(password, 10, function(err, hash) {
			if (err) {
				console.log(err.message);
			}

			var query = "INSERT INTO Users (UserId, LastName, FirstName, Email, Password) VALUES (";
			query += `${userId}, ${lastName}, ${firstName}, ${email}, '${hash}');`;
			if (data.location != undefined) {
				query = "INSERT INTO Users (UserId, LastName, FirstName, Email, Password, City, State, Country) VALUES (";
				query += `${userId}, ${lastName}, ${firstName}, ${email}, '${hash}', ${city}, ${state}, ${country});`;
			}

			connection.query(query, function(error, result) {
				if (error) {
	        console.log(error.message);
	        callback(errors.QueryError, undefined);
					return
				}
				connection.release();

				callback(undefined, {"userId":userId});
			});
		})
	});
}

function login(data, callback) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			callback(errors.ConnectionFailure, undefined);
			return;
		}

		var email = connection.escape(data.email);
		var password = connection.escape(data.password);

		var query = `SELECT UserId, Password FROM Users WHERE Email=${email};`;
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

			var storedHash = results[0].Password;
			bcrypt.compare(password, storedHash, function(err, res) {
				if (res == true) {
					callback(undefined, { userId: results[0].UserId });
				} else {
					callback(errors.PasswordError, undefined);
				}
			});
		});
	});
}

function deleteProfData(data, callback) {
  pool.getConnection(function(err, connection) {
		if (err) {
      console.log(err.message);
      callback(errors.ConnectionFailure);
			return;
		}
		var userId = connection.escape(data.id);

		var epQuery = `DELETE FROM EnergyPoints WHERE UserId=${userId}`;
		connection.query(epQuery, function(epError, results, fields) {
			var dataQuery = `DELETE FROM Locale_Data WHERE ProfId=${userId}`
			connection.query(dataQuery, function(dataError, results, fields) {
				connection.release();
				if (epError)
	        console.log(epError.message);
				if (dataError)
					console.log(dataError.message)
				if (dataError || epError){
					callback(errors.QueryError);
					return
				}

				callback(undefined);
			});
		});
	});
}
