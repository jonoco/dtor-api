const debug = require('debug')('app:torrent-client');
const WebTorrent = require('webtorrent');

function TorrentClient() {
	debug('creating client');
	TorrentClient.client = new WebTorrent();

	// TorrentClient.client.on('error', err => {
	// 	debug(`Error: ${err.message}`);
	// });
	
	return TorrentClient;
}

TorrentClient.addTorrent = function(link) {
	return new Promise((resolve, reject) => {
		TorrentClient.client.add(link, torrent => {
			debug(`torrent added: ${torrent.name}`);
			resolve(torrent);
		});

		
	});
}

TorrentClient.torrents = function() {
	debug(`torrents: ${TorrentClient.client.torrents}`);
	return TorrentClient.client.torrents;
}

TorrentClient.getTorrent = function(id) {
	debug(`getting torrent: ${id}`);
	return TorrentClient.client.get(id);
}

TorrentClient.removeTorrent = function(id) {
	return new Promise((resolve, reject) => {
		debug(`removing from client: ${id}`);
		TorrentClient.client.remove(id, err => {
			if (err) reject(err);
			resolve(id);
		});	
	});
}

module.exports = TorrentClient;