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

router.post('/deleteProfData', function(request, response) {
	var userId = request.body.id;
	user.delete(userId, function(err) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully Deleted Profile",
		});
	});
});

router.post('/fetchData', function(request, response) {
	var userId = request.body.id;
	var dataType = request.body.dataType;
	var assoc = request.body.assoc

	user.fetch(userId, dataType, assoc, function(err, values) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully retrieved profile data",
			Data: values
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

router.post('/createAccount', function(request, response) {
	var userId = request.body.id;
	var lastName = request.body.lastName;
	var firstName = request.body.firstName;
	var email = request.body.email;
	var password = request.body.password;
	var location = request.body.location;

	user.signup(userId, lastName, firstName, email, password, location, function(err, values) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully created profile",
			UserId: values
		});
	});
});

router.post('/login', function(request, response) {
	var email = request.body.email;
	var password = request.body.password;

	user.login(email, password, function(err, values) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		request.greenSession.userId = values.userId;

		response.send({
			Success: true,
			Message: "Logged in Successfully",
			UserId: values.userId,
			location: values.location,
			reset: values.reset
		});
	})
});

router.post('/locUpdate', function(request, response) {
	var userId = request.body.userId;
	var city = request.body.city;
	var state = request.body.state;
	var country = request.body.country;
	var zip = request.body.zip;

	user.updateLoc(userId, city, state, country, zip, function(err) {
		if (err) {
			err.Success = false;
			response.send(err);
			return
		}

		response.send({
			Success: true,
			Message: "Successfully updated location",
			UserId: userId
		});
	})
})

module.exports = router;
