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
  egrid: function(zip, callback) {
    getFromEGrid(zip, function(err, values) {
      if (err) {
        callback({ ErrorType: err.ErrorType, Message: "Error in E_Grid Retrieval"}, undefined);
        return
      }
      callback(undefined, values);
    });
  },
  consumption: function(type, state, country, callback) {
    var data = {
      "type":type,
      "state":state,
      "country": country
    }
    getConsumption(data, function(err, values) {
      if (err) {
        callback({ErrorType: err.ErrorType, Message: "Couldn't find Consumption for Query: "+type+", "+state+", "+country}, undefined);
        return
      }
      callback(undefined, values);
    });
  },
  cityRank: function(id, city, state, country, callback) {
    var data = {
      "id":id,
      "city":city,
      "state":state,
      "country":country
    };
    getCityRank(data, function(err, values) {
      if (err) {
        callback({ErrorType: err.ErrorType, Message: "Couldn't get city rank for user: "+id}, undefined);
        return
      }
      callback(undefined, values);
    });
  },
  stateRank: function(id, state, country, callback) {
    var data = {
      "id":id,
      "state":state,
      "country":country
    };
    getStateRank(data, function(err, values) {
      if (err) {
        callback({ErrorType: err.ErrorType, Message: "Couldn't get state rank for user: "+id}, undefined);
        return
      }
      callback(undefined, values);
    });
  }
}

function getFromEGrid(zipCode, callback) {
  pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
			callback(errors.ConnectionFailure, undefined);
			return;
		}

		var zip = connection.escape(zipCode);
		var query = "SELECT e_factor, Subregion FROM EGrid WHERE Zip="+zip+";";
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

      var values = {
        e_factor: results[0].e_factor,
        subregion: results[0].Subregion
      }

      callback(undefined, values);
		});
	});
}

function getConsumption(data, callback) {
  pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err.message);
      callback(errors.ConnectionFailure, undefined);
			return;
		}
		var type = connection.escape(data.type);
		var state = connection.escape(data.state);
		var country = connection.escape(data.country);

		var query = "SELECT Year, Consumption from Consumption WHERE Type="+type+" AND State="+state+" AND Country="+country+";";
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

      var values = {
        Year: results[0].Year,
        Consumption: results[0].Consumption
      }

      callback(undefined, values);
		});
	});
}

function getCityRank(data, callback) {
  pool.getConnection(function(err, connection) {
		if (err) {
      console.log(err.message);
      callback(errors.ConnectionFailure, undefined);
			return;
		}

		var userId = connection.escape(data.id)
		var city = connection.escape(data.city)
		var state = connection.escape(data.state)
		var country = connection.escape(data.country)

		var query = "SELECT rank FROM (SELECT @rank:=@rank+1 as rank, Points, UserId FROM EnergyPoints, (SELECT @rank:=0) r WHERE City=";
		query += city + " AND State="+state+" AND Country="+country+" ORDER BY POINTS DESC) t WHERE UserId="+userId+";";
		query += "SELECT COUNT(UserId) as Count FROM EnergyPoints WHERE City="+city+" AND State="+state+" AND Country="+country+";";

		connection.query(query, function(error, results, fields) {
			connection.release();
			if (error) {
        console.log(error.message);
        callback(errors.QueryError, undefined);
				return
			}
			if (results[0].length == 0) {
        callback(errors.ZeroResults, undefined);
				return
			}

      var values = {
        "Rank":results[0][0].rank,
				"Count":results[1][0].Count
      }
      callback(undefined, values);
		})
	});
}

function getStateRank(data, callback) {
  pool.getConnection(function(err, connection) {
		if (err) {
      console.log(err.message);
      callback(errors.ConnectionFailure, undefined);
			return;
		}

		var userId = connection.escape(data.id)
		var state = connection.escape(data.state)
		var country = connection.escape(data.country)

		var query = "SELECT rank FROM (SELECT @rank:=@rank+1 as rank, Points, UserId FROM EnergyPoints, (SELECT @rank:=0) r WHERE State=";
		query += state+" AND Country="+country+" ORDER BY POINTS DESC) t WHERE UserId="+userId+";";
		query += "SELECT COUNT(UserId) as Count FROM EnergyPoints WHERE State="+state+" AND Country="+country+";";

		connection.query(query, function(error, results, fields) {
      connection.release();
			if (error) {
        console.log(error.message);
        callback(errors.QueryError, undefined);
				return
			}
			if (results[0].length == 0) {
        callback(errors.ZeroResults, undefined);
				return
			}

			var values = {
        "Rank":results[0][0].rank,
				"Count":results[1][0].Count
      }
      callback(undefined, values);
		})
	});
}
