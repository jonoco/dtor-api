const db  = require('../db');
const jwt = require('jwt-simple');
const KEY = process.env.KEY;
const debug = require('debug')('app:authentication-controller');

function tokenForUser(user) {
	const timestamp = new Date().getTime();
	return jwt.encode({ sub: user.id, iat:timestamp }, KEY);
}

function Response(status, body) {
	this.status = status;
	this.body = body;
}

/*
	Signup a new user

	body:
		username (string)
		password (string)

	returns:
		token (string)
		username (string)
*/
exports.signup = function (req, res, next) {
	const { username, password } = req.body;

	if (!username || !password) return res.status(422).json({message: 'You must provide a username and password'});

	db.user.findOne({ 
		where: { username }
	})
		.then(user => {
			if (user) throw new Response(422, {message: 'Username already taken'});
			
			return db.user.create({
				username,
				password
			});
		})
		.then(newUser => {
			res.json({
				token: tokenForUser(newUser),
				username: newUser.username
			});
		})
		.catch(err => {
			if (err instanceof Response) {
				res.status(err.status).json(err.body);
			} else {
				res.json({ message: err });
			}
		});
}

/*
	Log in an existing user

	body:
		username (string)
		password (string)

	returns:
		token (string)
		username (string)
		driveAuth (bool)
*/
exports.login = function (req, res, next) {
	const userID = req.user.id;
	db.user.findById(userID)
		.then(user => {
			const driveAuth = user.refreshToken ? true : false;

			debug(`tokens: ${user.refreshToken}`)

			res.json({
				token: tokenForUser(req.user),
				username: req.user.username,
				driveAuth
			});
		});
}