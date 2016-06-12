const debug = require('debug')('app:socket');
const _ = require('lodash');

/*
	Static socket reference object
*/
function Socket(server) {
	if (server) {
		debug('creating socket');
		Socket.io = require('socket.io')(server);
		return Socket;
	}
}

/*
	Client list matches usernames for most recent socket connection

	_list: { user: socketID }
	get: get socketID for a username
	set: sets a socketID for a username
	clear: removes entty for a username

*/
Socket.clients = {
	_list: {},
	get: function(user) {
		const socketID = this._list[user];
		debug(`getting socket id: ${socketID} for user: ${user}`);
		
		return socketID;
	},
	set: function(user, id) {
		debug(`setting socket id: ${id} for user: ${user}`);
		this._list[user] = id;
	},
	clear: function(user) {
		debug(`clearing socket id for ${user}`);
		_.unset(this._list, user);
	} 
};

/*
	Emits a message

	@param type (string) - message type
	@param message (object) - message object
	@param [user] (string) - a user to emit message to; else emit to all connected
*/
Socket.emit = function(type, message, user) {
	debug(`emit [${type}] ${JSON.stringify(message)} - for [${user ? user : 'all'}]`);
	if (user) {
		const id = Socket.clients.get(user);
		Socket.io.sockets.sockets[id].emit(type, message);
	} else {
		Socket.io.emit(type, message);
	}
}

module.exports = Socket;
