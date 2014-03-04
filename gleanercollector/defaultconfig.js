/*
Collector configuration
*/
module.exports = {
	// Salt for user sessions key generation
	usersessionSalt: 'your-salt-here',
	// shared mongodb database
	db: null,
	// mongodb configuration
	mongodb : {
		host: 'localhost',
		port: 27017,
		database: 'testdatabasepedro'//'gleaner-collector'
	},
	// If mysql is set to true, all traces will be stored as JSON strings in a MySQL database
	usemysql: false,
	// mysql configuration
	mysql: {
		host: 'localhost',
		user: 'root',
		password: 'pass',
		database: 'gleaner_collector_frontend'
	}
};
