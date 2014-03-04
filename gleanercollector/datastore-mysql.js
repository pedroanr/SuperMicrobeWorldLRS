var DatastoreMySQL = function( configuration ){
	var Datastore = require('./gleanercollector/datastore.js');
	var datastore = new Datastore(configuration);
	var mysql = require('mysql');
	var pool = mysql.createPool({
		host: configuration.mysql.host,
		user: configuration.mysql.user,
		password: configuration.mysql.password,
		database: configuration.mysql.database
	});

	var startSession = function( req, userId, sessionkey, cb ){
		datastore.startSession(req, userId, sessionkey, cb);
	};

	var addTraces = function( req, traces, cb ){
		var logicTraces = [];
		var inputTraces = [];
		for (var i = 0; i < traces.length; i++) {
			var trace = null;
			switch(traces[i].type){
				case 'logic':
				delete(traces[i].type);
				logicTraces.push([req.headers.authorization, JSON.stringify(traces[i])]);
				break;
				case 'input':
				delete(traces[i].type);
				inputTraces.push([req.headers.authorization, JSON.stringify(traces[i])]);
				break;
				default:
				// FIXME add it to some other table??
				break;
			}
		}

		pool.getConnection( function( err, conn ){
			if ( err ){
				cb(err);
				return;
			}
			var query = conn.query('INSERT INTO input_traces(usersessionkey, json) VALUES ' + mysql.escape(inputTraces), function( err, result ){
				if ( err ){
					conn.end();
					cb(err);
				}
				else {
					conn.query('INSERT INTO logic_traces(usersessionkey, json) VALUES ' + mysql.escape(logicTraces), function( err, result ){
						conn.end();
						cb(err);
					});
				}
			});
		});
	};

	var checkSessionKey = function( usersessionkey, cb ){
		datastore.checkSessionKey(usersessionkey, cb);
	};

	var addSessionInfo = function( ){

	};

	var countTraces = function( usersessionkey, cb ){
		pool.getConnection( function( err, conn ){
			conn.query('SELECT COUNT(*) count FROM logic_traces WHERE usersessionkey=?', usersessionkey, function( err, result ){
				if ( err ){
					conn.end();
					cb(err);
				}
				else {
					var count = result[0].count;
					conn.query('SELECT COUNT(*) count FROM input_traces WHERE usersessionkey=?', usersessionkey, function( err, result2 ){
						cb(err, count + result2[0].count );
						conn.end();
					});
				}
			});
		});
	};

	var removeTraces = function( usersessionkey, cb ){
		pool.getConnection( function( err, conn ){
			conn.query('DELETE FROM logic_traces WHERE usersessionkey=?', usersessionkey, function( err ){
				if ( err ){
					conn.end();
					cb(err);
				}
				else {
					conn.query('DELETE FROM input_traces WHERE usersessionkey=?', usersessionkey, function( err ){
						cb(err);
						conn.end();
					});
				}
			});
		});
	};

	return {
		addTraces: addTraces,
		startSession: startSession,
		checkSessionKey: checkSessionKey,
		addSessionInfo: addSessionInfo,
		countTraces: countTraces,
		removeTraces: removeTraces
	};
};

module.exports = DatastoreMySQL;