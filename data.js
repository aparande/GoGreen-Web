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
  input: function(id, dataType, month, amount, city, state, country, callback) {
    var data = {
      "profId": id,
      "dataType": dataType,
      "month": month,
      "amount": amount,
      "city": city,
      "state": state,
      "country": country
    }

    inputData(data, function(err) {
      if (err) {
        callback({ ErrorType: err.ErrorType, Message: "Could not save data for User: "+id});
        return
      }
      callback(undefined);
    });
  },
  delete: function(id, dataType, month, callback) {
    var data = {
      "profId": id,
      "dataType": dataType,
      "month": month,
    }

    deleteData(data, function(err) {
      if (err) {
        callback({ ErrorType: err.ErrorType, Message: "Could not delete data for User: "+id});
        return
      }
      callback(undefined);
    });
  }
}

function inputData(data, callback) {
  pool.getConnection(function(err, connection) {
		if (err) {
      console.log(err.message);
      callback(errors.ConnectionFailure);
      return;
		}
		var profId = connection.escape(data.profId);
		var type = connection.escape(data.dataType);
		var month = connection.escape(data.month);
		var amount = connection.escape(data.amount);
		var city = connection.escape(data.city);
		var state = connection.escape(data.state);
		var country = connection.escape(data.country);

		var query = "INSERT INTO Locale_Data (ProfId, DataType, Month, Amount, City, State, Country) VALUES (";
		query += profId+", ";
		query += type+", ";
		query += month+", ";
		query += amount+", ";
		query += city+", ";
		query += state+", ";
		query += country+") ON DUPLICATE KEY UPDATE Amount = VALUES(Amount);";

		connection.query(query, function(error, results, fields) {
			if (error) {
        console.log(error.message);
        callback(errors.QueryError);
				return
			}
			connection.release();

			callback(undefined);
		});
	})
}

function deleteData(data, callback) {
  pool.getConnection(function(err, connection) {
		if (err) {
      console.log(err.message);
      callback(errors.ConnectionFailure);
      return;
		}

		var profId = connection.escape(data.profId);
		var type = connection.escape(data.dataType);
		var month = connection.escape(data.month);

		var query = "DELETE FROM Locale_Data WHERE ProfId = "+profId+" AND DataType = "+type+" AND Month = "+month+";";
		connection.query(query, function(error, results, fields) {
			if (error) {
        console.log(error.message);
        callback(errors.QueryError);
				return
			}
			connection.release()

			callback(undefined);
		});
	});
}
