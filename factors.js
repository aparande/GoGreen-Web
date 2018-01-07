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
        console.log(query);
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
