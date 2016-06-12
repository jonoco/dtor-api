const bcrypt = require('bcrypt-nodejs');

module.exports = function (sequelize, DataTypes) {
	const User = sequelize.define('user', {
		username: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				notEmpty: true
			}
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				notEmpty: true
			}
		},
		userSince: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW
		},
		accessToken: DataTypes.STRING,
		refreshToken: DataTypes.STRING
	}, {
		instanceMethods: {
			comparePassword
		}
	});

	User.hook('beforeCreate', (user, options) => {
		return hashPassword(user.password)
			.then(hash => {
				user.password = hash;
			})
			.catch(err => {
				return sequelize.Promise.reject(err);
			});
	});

	return User;
}

function hashPassword(password) {
	return new Promise((resolve, reject) => {
		bcrypt.genSalt(10, (err, salt) => {
			if (err) return reject(err);

			bcrypt.hash(password, salt, null, (err, hash) => {
				if (err) return reject(err);

				resolve(hash);
			});
		})
	});
}

function comparePassword(candidatePassword) {
	return new Promise((resolve, reject) => {
		bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
			if (err) return reject(err);

			resolve(isMatch);
		});
	});
}



