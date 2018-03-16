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
			var message = `Dear, ${name}.\n\n\tWe recently received a password reset request for your GoGreen account. \
	In order to reset your password, please login to GoGreen with the provided temporary password to begin the \
	reset process. If you did not request a password reset, then we recommend you still change your password to increase \
	the security of your account.\n\nTemporary Password: ${newPassword}\nReset Link:\n\n If you have any questions, \
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
	console.log('Express server listening on port %d in %s mode', this.address().port, process.env.MODE);
});

function sendEmail(email, subject, message, callback) {
	var emailHost = process.env.EMAIL_USER;
	var emailPass = process.env.EMAIL_PASS;

	var transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: emailHost,
			pass: emailPass
		}
	});

	var mailOptions = {
		from: emailHost,
		to: email,
		subject: subject,
		text: message
	};

	transporter.sendMail(mailOptions, function(error, info) {
		if (error) {
			console.log(error);

			callback({
				"status":"Error",
				"message":"<strong>Error:</strong> We could not reset your password. Please try again.",
			});
		} else {
			console.log('Email sent: '+info.response);

			callback({
				"status":"Success",
				"message":"<strong>Success:</strong> Password successfully reset. Please check your email for more instructions."
			})
		}
	});
}
