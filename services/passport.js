const passport       = require('passport');
const db             = require('../db');
const debug 				 = require('debug')('app:passport');
const { Strategy }   = require('passport-jwt');
const { ExtractJwt } = require('passport-jwt');
const LocalStrategy  = require('passport-local');

const KEY = process.env.KEY;

// create local strategy
const localOptions = { usernameField: 'username'}; // check 'username' for username
const localLogin = new LocalStrategy(localOptions, (username, password, done) => {

	// verify username and password -> call done with user
	// if not correct -> call done with false
	db.user.findOne({ where: { username }})
		.then(user => {
			if (!user) return done(null, false);

			user.comparePassword(password)
				.then(isMatch => {
					return isMatch ? done(null, user) : done(null, false);
				})
				.catch(err => {
					return done(err);
				})
		})
		.catch(err => {
			return done(err);
		});
});

// setup options for JWT strategy
const jwtOptions = {
	jwtFromRequest: ExtractJwt.fromHeader('authorization'), // check header key 'authorization' for token
	secretOrKey: KEY
};

// create JWT strategy
// payload: sub and iat of jwt
// done: callback for completion
const jwtLogin = new Strategy(jwtOptions, function(payload, done) {
	// see if user id in the payload exists in our database
	// if it does, call done with that object
	// if not, call done without a user object
	db.user.findById(payload.sub)
		.then(user => {
			if (!user) return done(null, false);

			done(null, user);
		})
		.catch(err => {
			done(err, false);
		});
});

// tell pasport to use this strategy
passport.use(jwtLogin);
passport.use(localLogin);