const express    = require('express');
const http       = require('http');
const bodyParser = require('body-parser');   			// parses request bodies
const morgan     = require('morgan');        			// logging middleware
const cors       = require('cors');          			// allows Cross-Origin-Requests
const db         = require('./db');          			// Sequelize postgres database
const router     = require('./router');      			// express router
const debug 		 = require('debug')('app:server');// debug logging utility

const app = express();
const PORT = process.env.PORT || 3090;
const MODE = process.env.MODE;

app.use(morgan(MODE === 'dev' ? 'dev' : 'combined'));
app.use(cors());
app.use(bodyParser.json({ type: '*/*' }));
app.use('/api', router);

const server = http.createServer(app);

// start torrent client
require('./services/torrent-client')();

// bind server to socket.io connection
const { clients, io, emit } = require('./services/socket')(server);

io.on('connection', socket => {
	socket.on('user', username => {
		debug(`user ${username} connected with socket id: ${socket.id}`);
		clients.set(username, socket.id);

		emit('message', `hello ${username}!`);
	});
});

db.sequelize.sync({force: true})
  .then( () => {
    server.listen(PORT);
    console.log(`Listening on ${PORT}...`);  
  });

module.exports = server;