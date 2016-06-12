const db = require('../db');
const WebTorrent = require('webtorrent');
const fs = require('fs');
const archiver = require('archiver');
const debug = require('debug')('app:torrent-controller');
const _ = require('lodash');
const { uploadFiles } = require('../services/google');
const { emit } = require('../services/socket');
const { getTorrent, addTorrent, removeTorrent } = require('../services/torrent-client');

/*
	Deletes single or array of files
*/
function deleteFile(file, path) {
	return new Promise((resolve, reject) => {
		const files = _.isArray(file) ? file : [file];
		var filesRemaining = files.length;
		files.forEach(file => {
			debug(`deleting ${file.name}`);

			var filePath = `${path}/${file.path}`;
			filesRemaining--;

			fs.unlink(filePath, err => {
		    if (err) reject(err);
		  });

		  if (!filesRemaining) resolve(file);	
		});	
  });
}

/*
	Upload torrent

	
	@param userID (string) - user id
	@param username (string) - username
	@param torrentID (string) - torrent infohash
*/
function upload(userID, username, torrentID) {
	const torrent = getTorrent(torrentID);
	return new Promise((resolve, reject) => {
		uploadFiles(userID, torrent.files)
		.then( () => {
			debug(`uploaded ${torrent.name}`);

			resolve(torrent.infoHash);

			const message = { 
				id: torrent.infoHash, 
				name: torrent.name, 
				progress: torrent.progress, 
				uploaded: true, 
				downloaded: true
			};
			emit('torrent', message, username);
		})
		.catch(err => {
			const message = { 
				id: torrent.infoHash, 
				name: torrent.name, 
				progress: torrent.progress, 
				uploaded: false, 
				downloaded: true,
				error: err 
			};
			emit('torrent', message, username);
			
			reject(err);

			debug(err.message);
		});
	});
}

/*
	Deletes torrent and removes it from client

	@param torrent (object) - torrent object to delete

	@returns (Promise)
		resolve (object) - torrent object deleted
		reject (object) - error object
*/
function deleteTorrent(torrent) {
	return new Promise((resolve, reject) => {
		deleteFile(torrent.files, torrent.path)
		.then(deletedFiles => {
			resolve(removedTorrent)

			// remove torrent from client
			return removeTorrent(torrent.infoHash);
		})
		.then(removedTorrent => {
			debug(`removed ${removedTorrent}`);
		})
		.catch(err => {
			debug(err.message);
			reject(err);
		});	
	});
}

/*
	Delete torrent

	body:
		torrentID (string) - infohash of torrent to delete

	returns:
		torrentID (string) - deleted torrent infohash
*/
exports.deleteTorrent = function(req, res, next) {
	const torrentID = req.body.torrentID;

	deleteTorrent(torrentID)
	.then(id => {
		res.json({ torrentID: id });	
	})
	.catch(err => {
		res.status(500).json({ message: err.message });
	});
}

/*
	Uploads torrent to drive

	body:
		torrentID (string) - infohash of torrent to upload

	returns:
		torrentID (string) - torrent infohash
*/
exports.uploadTorrent = function(req, res, next) {
	const userID = req.user.id;
	const username = req.user.username;
	const torrentID = req.body.torrentID;

	upload(userID, username, torrentID)
	.then(id => {
		res.json({ torrentID: id });	
	})
	.catch(err => {
		res.status(500).json({ message: err.message });
	});
}

/*
	Fetches torrent from a provided magnet link

	body:
		torrent (string) - a torrent magnet link

	returns:
		torrent (object) - torrent name
*/
exports.getTorrent = function(req, res, next) {
	const emitDebounce = _.debounce(emit, 250, {'maxWait': 1000}); // debounced socket emissions
	const user = req.user.id;
	const username = req.user.username;
	const link = req.body.torrent;
	const driveAuth = req.user.accessToken ? true : false;

	debug(`user id: ${user} link ${link}`);

	addTorrent(link)
		.then(torrent => {
			debug(`user: ${user} torrent: ${torrent.name}`);

			db.torrent.create({
				user, 
				torrent: torrent.infoHash
			});

			res.json({ torrent: torrent.name });
			
			const message = { 
				id: torrent.infoHash, 
				name: torrent.name, 
				progress: 0, 
				uploaded: false, 
				downloaded: false 
			};
			emit('torrent', message, username);

			torrent.on('download', () => {
				// download events are fired rapidly; debounced so they won't overwhelm the socket and client
				const message = { 
					id: torrent.infoHash, 
					name: torrent.name, 
					progress: torrent.progress, 
					uploaded: false, 
					downloaded: false 
				};
				emitDebounce('torrent', message, username);
			});

			torrent.on('done', () => {
				debug(`download complete: ${torrent.name}`);

				const message = { 
					id: torrent.infoHash, 
					name: torrent.name, 
					progress: torrent.progress, 
					uploaded: false, 
					downloaded: true 
				};
				emit('torrent', message, username);

				// upload torrent after download completion if the drive is authenticated
				if (driveAuth) upload(user, username, torrent.infoHash);
			});
		})
		.catch(err => {
			res.status(403).json({ message: err.message });
		});
}

/*
	Download completed torrent from server

	params:
		id - torrent id

	returns:
		file (attachment)
*/
exports.downloadTorrent = function(req, res, next) {
	const { id } = req.params;
	const torrent = getTorrent(id);
	const archive = archiver('zip', {});
	
	archive.on('end', () => {
		debug(`archive completed, wrote ${archive.pointer()} bytes`);
	});

	archive.on('error', err => {
		debug(`archive error: ${err.message}`);
		res.status(500).send({ message: err.message });
	});

	torrent.files.forEach(file => {
		var filePath = `${torrent.path}/${file.path}`;
		archive.file(filePath, { name: file.name });	
	});

	res.attachment(`${torrent.name}.zip`);
	archive.pipe(res);
	archive.finalize();
}


