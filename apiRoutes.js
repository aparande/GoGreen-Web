var express = require('express');
var bodyParser = require('body-parser');
var factors = require("./factors");
var user = require("./user");
var dataManager = require("./data");

var router = express.Router();

router.use(bodyParser.urlencoded({
	extended:true
}));

router.use(bodyParser.json());

router.post('/logData', function(request, response) {
	var profId = request.body.profId; var type = request.body.dataType; var month = request.body.month;
	var amount = request.body.amount; var city = request.body.city; var state = request.body.state; var country = request.body.country;

	dataManager.input(profId, type, month, amount, city, state, country, function(err) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully Added Data",
		});
	});
});

router.post('/deleteDataPoint', function(request, response) {
	var profId = request.body.profId; var type = request.body.dataType; var month = request.body.month;
	dataManager.delete(profId, type, month, function(err) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully Deleted Data",
		});
	});
});

router.post('/getFromEGrid', function(request, response) {
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

router.post('/getFromConsumption', function(request, response) {
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

router.post('/logEnergyPoints', function(request, response) {
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

router.post('/getCityRank', function(request, response) {
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

router.post('/getStateRank', function(request, response) {
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

module.exports = router;
