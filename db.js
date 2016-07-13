const Sequelize = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/dtor';
let seq;

if (process.env.DATABASE_URL) {
	// production; heroku

	seq = new Sequelize(DATABASE_URL, { 
		dialect: 'postgres',
		protocol: 'postgres',
		dialectOptions: {
       ssl: true
    },
    logging : false
	});
} else {
	// development; local

	seq = new Sequelize(DATABASE_URL, { dialect: 'postgres' });
}


let db = {};
db.user = seq.import(`${__dirname}/models/user.js`);
db.torrent = seq.import(`${__dirname}/models/torrent.js`);
db.sequelize = seq;
db.Sequelize = Sequelize;

module.exports = db;