module.exports = function(sequelize, DataTypes) {
	const Torrent = sequelize.define('torrent', {
		user: {
			type: DataTypes.STRING,
			allowNull: false
		},
		torrent: {
			type: DataTypes.STRING,
			allowNull: false
		}
	});

	return Torrent;
}