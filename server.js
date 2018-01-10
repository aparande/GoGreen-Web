require('dotenv').config()

var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var favicon = require('serve-favicon');
var session = require('express-session');

var app = module.exports = express();

app.use("/api", require('./apiRoutes'));

app.use(favicon(__dirname+'/public/img/favicon.ico'));

app.use(bodyParser.urlencoded({
	extended:true
}));

app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));
app.use("/img", express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/public'));
app.use("/js", express.static(__dirname + '/public'));
app.use("/lib", express.static(__dirname + '/public'));

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
		to: emailHost,
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

app.listen(process.env.PORT || 8000, function() {
	console.log('Express server listening on port %d in %s mode', this.address().port, process.env.MODE);
});
