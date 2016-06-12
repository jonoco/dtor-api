const db = require('../db');
const debug = require('debug')('app:drive-controller');
const { generateClient, generateAuthUrl } = require('../services/google');

/*
	Get authorization to use Drive from user

	returns:
		url (string) - redirect url to authenticate drive user
*/
exports.login = function(req, res, next) {
	debug('login');

	debug('user: ', req.user.username);

	generateClient()
		.then(client => {
			const authUrl = generateAuthUrl(client);

		  res.json({ url: authUrl });
		})
		.catch(err => {
			res.status(500).json({error: err });
		});
};

/*
	Get code for access token from Drive authentication

	returns: 
		success (bool) - indicate auth success
*/
exports.authClient = function(req, res, next) {
	const { code } = req.query;
	
	generateClient()
		.then(client => {

			// exchange auth code for tokens
			client.getToken(code, (err, token) => {
				if (err) res.status(500).json({ error: 'Error while trying to retrieve token' });

				debug(`token granted: ${token}`);
				debug(`user: ${req.user.username}`);

				const userID = req.user.id;
				
				// store tokens in database
				db.user.findById(userID)
					.then(user => {
						return user.update({
							refreshToken: token.refresh_token,
							accessToken: token.access_token		
						});
					})
					.then( () => {
						debug('authentication success');
						res.json({ success: true })				
					})
					.catch(err => {
						debug(err);
						res.status(500).json({ error: err });
					});
			})
		})
		.catch(err => {
			debug(err);
			res.status(500).json({ error: err });
		});
};


