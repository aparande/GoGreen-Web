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
				if (err == errors.ZeroResults) {
					callback({ ErrorType: err.ErrorType, Message: "Incorrect Email/Password"}, undefined);
				} else if (err == errors.PasswordError) {
					callback({ ErrorType: err.ErrorType, Message: "Incorrect Email/Password"}, undefined);
				} else {
					callback({ ErrorType: err.ErrorType, Message: "Incorrect Email/Password"}, undefined);
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

	updateLoc: function(userId, city, state, country, zip, callback) {
		var data = {
			"id": userId,
			"city": city,
			"state": state,
			"country": country,
			"zip": zip
		}

		updateUserLocation(data, function(error) {
			if (error) {
				callback({ ErrorType: error.ErrorType, Message: "Could not update user location"});
        return
			}
			callback(undefined);
		})
	},

	reqReset: function(email, callback) {
		var data = {
			"email": email
		}

		resetRequest(data, function(error, result) {
			if (error) {
				var message= "<strong>Error:</strong> We could not reset your password";
				if (error.ErrorType == errors.ZeroResults) {
					message= "<strong>Error:</strong> There is no account associated with this email";
				}
				callback({ErrorType: error.ErrorType, Message: message})
				return;
			}

			callback(undefined, {
				"email": email,
				"password":result.password,
				"name":result.name
			});
		})
	},

	resetPass: function(userId, newPass, callback) {
		var data = {
			"userId": userId,
			"newPassword": newPass,
		}

		passwordReset(data, function(error) {
			if (error) {
				callback({ ErrorType: error.ErrorType, Message: "Could not update user location"});
        return
			}
			callback(undefined);
		})
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
		var city = undefined; var state = undefined; var country = undefined; zip = undefined;
		if (data.location !== undefined) {
			data.location = data.location.replace("[", "{").replace("]", "}");
			data.location = JSON.parse(data.location);

			city = connection.escape(data.location.City);
			state = connection.escape(data.location.State);
			country = connection.escape(data.location.Country);
			zip = connection.escape(data.location.Zip);
		}

		var password = data.password;
		bcrypt.hash(password, 10, function(err, hash) {
			if (err) {
				console.log(err.message);
			}

			var query = "INSERT INTO Users (UserId, LastName, FirstName, Email, Password) VALUES (";
			query += `${userId}, ${lastName}, ${firstName}, ${email}, '${hash}');`;
			if (data.location != undefined) {
				query = "INSERT INTO Users (UserId, LastName, FirstName, Email, Password, City, State, Country, ZipCode) VALUES (";
				query += `${userId}, ${lastName}, ${firstName}, ${email}, '${hash}', ${city}, ${state}, ${country}, ${zip});`;
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
		var password = data.password;

		var query = `SELECT UserId, Password, ResetPass, City, State, Country, ZipCode FROM Users WHERE Email=${email};`;
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
			var resetHash = results[0].ResetPass;
			bcrypt.compare(password, storedHash, function(err, passRes) {
				if (passRes == true) {
					callback(undefined, {
						userId: results[0].UserId,
						location: {
							city: results[0].City,
							state: results[0].State,
							country: results[0].Country,
							zip: results[0].ZipCode
						},
						reset: false
					});
					return;
				} else {
					bcrypt.compare(password, resetHash, function(err, tempRes) {
						if (tempRes == true) {
							callback(undefined, {
								userId: results[0].UserId,
								location: {
									city: results[0].City,
									state: results[0].State,
									country: results[0].Country,
									zip: results[0].ZipCode
								},
								reset: true
							});
							return;
						} else {
							callback(errors.PasswordError, undefined);
						}
					});
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

function updateUserLocation(data, callback) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			callback(errors.ConnectionFailure);
			return;
		}

		var userId = connection.escape(data.id);
		var city = connection.escape(data.city);
		var state = connection.escape(data.state);
		var country = connection.escape(data.country)
		var zip = connection.escape(data.zip);
		var locQuery = `UPDATE Users SET City=${city}, State=${state}, Country=${country}, ZipCode=${zip} WHERE UserId=${userId};`;
		connection.query(locQuery, function(error, results, fields) {
			connection.release();
			if (error) {
				console.log(error.message);
        callback(errors.QueryError);
				return
			}

			callback(undefined);
		});
	})
}

function resetRequest(data, callback) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			callback(errors.ConnectionFailure);
			return;
		}

		var email = connection.escape(data.email);
		var userQuery = `SELECT UserId, FirstName from Users where Email=${email}`;
		connection.query(userQuery, function(userError, userResults, fields) {
			if (userError) {
				console.log(searchError.message);
        callback(errors.QueryError, undefined);
				return
			}

			if (userResults.length == 0) {
				callback(errors.ZeroResults, undefined);
				return;
			}

			var password = uuid().substring(Math.floor(Math.random() * 2), Math.floor(Math.random() * 10 + 8)).replace("-","5");
			bcrypt.hash(password, 10, function(err, hash) {
				if (err) {
					console.log(err.message);
				}

				var date = new Date().toISOString().slice(0, 19).replace('T', ' ');
				var resetPassQuery = `UPDATE Users SET ResetPass='${hash}', ResetDate='${date}' WHERE UserId='${userResults[0].UserId}';`;
				connection.query(resetPassQuery, function(resetError) {
					connection.release();
					if (resetError) {
						console.log(resetError.message);
						console.log(resetPassQuery);
		        callback(errors.QueryError, undefined);
						return
					}

					callback(undefined, {
						"name": userResults[0].FirstName,
						"password": password
					});
				});
			});
		});
	});
}

function passwordReset(data, callback) {
	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			callback(errors.ConnectionFailure);
			return;
		}

		var userId = connection.escape(data.userId);
		var newPassword = data.newPassword;
		bcrypt.hash(newPassword, 10, function(err, hash) {
			var query = `UPDATE Users SET Password='${hash}', ResetPass=NULL, ResetDate= NULL WHERE UserId=${userId}`;
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
	});
}
