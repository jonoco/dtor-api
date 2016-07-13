const debug = require('debug')('app:google');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const db = require('../db');
const _ = require('lodash');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const INITIAL_TIMEOUT = 1000; // 1 second initial timeout
const timeouts = {};					// file timeouts

/*
	Generates oauth client

	@return (Promise) 
		resolve(object) - oauth client
*/
const generateClient = function() {
	debug('generate client');

	return new Promise((resolve, reject) => {
	  const REDIRECT_PATH = process.env.NODE_ENV === 'production' ?
	                       	'https://dtor.herokuapp.com/auth' :
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
					
					upload(drive, file, (err, success) => {
						if (err) {
							reject(err);
						}

						if (success) {
							filesRemaining--;

							debug(`uploaded to drive: ${file.name} - remaining: ${filesRemaining}`);

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
/*
	Upload single file

	@param drive (object) - google drive client
	@param file (object) - file object
	@param callback (function) {err, success} - callback for success or failure of upload
*/
const upload = function(drive, file, callback) {
	drive.files.create({
	  resource: { name: file.name },
	  media: { body: file.createReadStream() }
	}, (err, response) => {
		if (err) {
			if (err.code === 403) {
				// 403 is likely user quota limit exceeded - need finer error checking
				// timeout uses exponential backoff til no greater than 16 second timeout

				const timeout = timeouts[file.name] ? (timeouts[file.name] * 2) : INITIAL_TIMEOUT;
				if (timeout > 16000) return callback(err);
	
				// save timeout for file
				timeouts[file.name] = timeout;

				const wait = timeout + _.random(100, 500, true); // add random ms difference to timeout
				debug(`timeout for ${wait}ms: ${file.name}`);
				return _.delay(upload, wait, drive, file, callback);
			}
			callback(err);
		}
		
		// respond success or failure
		if (response) {
			callback(null, file.name);
		}
	});
}

module.exports = {
	generateClient,
	generateAuthUrl,
	uploadFiles
}

