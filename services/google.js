const debug = require('debug')('app:google');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const db = require('../db');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

/*
	Generates oauth client

	@return (Promise) 
		resolve(object) - oauth client
*/
const generateClient = function() {
	debug('generate client');

	return new Promise((resolve, reject) => {
	  const REDIRECT_PATH = process.env.NODE_ENV === 'production' ?
	                       	'https://wtorrent.herokuapp.com/auth' :
	                       	'http://localhost:3000/auth';
	  const auth = new googleAuth();
		const client = new auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_PATH);

	  resolve(client);
	});
};

/*
	Generates and returns drive authentication url

	@param client (object) - oauth client

	@return (string) - authentication url
*/
const generateAuthUrl = function(client) {
	return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
}

/*
	Upload files to Drive account

	@param user (string) - user id for file transmission
	@param files (array) - array of file objects for upload

	@return (Promise)
		resolve()
		reject(string) - error message
*/
const uploadFiles = function(user, files) {
	debug('uploading files');

	return new Promise((resolve, reject) => {
		// get client
		var client;
		generateClient()
			.then(_client => {
				client = _client;
				// get user credentials
				return db.user.findById(user);
			})
			.then(user => {
				const { refreshToken, accessToken } = user;

				debug(`tokens retrieved: ${refreshToken} ${accessToken}`);
				
				if (!accessToken || !refreshToken) reject('Error: no access or refresh token');

				// credentialize client
				client.setCredentials({
					access_token: accessToken,
					refresh_token: refreshToken
				});

				// begin uploading torrent files
				const drive = google.drive({ version: 'v3', auth: client });
				
				let filesRemaining = files.length;
				files.forEach( file => {
					
					drive.files.create({
			      resource: {
			        name: file.name
			      },
			      media: {
			        body: file.createReadStream()
			      }
			    }, (err, response) => {
			    	if (err) {
			    		// TODO
			    		// err.code === 403 retry upload after a timeout
			    		reject(err);
			    	}
						
						// respond success or failure
			    	if (response) {
			    		filesRemaining--;

			    		debug(`uploaded to drive: ${file.name}`);

			    		if (!filesRemaining) {
			    			debug(`finished uploading`);
			    			resolve();
			    		}
			    	}
			    });
				});
			})
			.catch(err => {
				reject(err);
			});
	});
}

module.exports = {
	generateClient,
	generateAuthUrl,
	uploadFiles
}

