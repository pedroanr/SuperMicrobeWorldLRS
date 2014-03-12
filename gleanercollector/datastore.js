var DataStore = function( config ){
	var async = require('async');
	var SHA1 = new (require('jshashes').SHA1)();
	var authenticators = require('./authenticators');
	var ipauthenticator = authenticators.ipauthenticator;
	var eadauthenticator = authenticators.eadauthenticator;
	var userauthenticator = authenticators.userauthenticator;
	var nicknameauthenticator = authenticators.nicknameauthenticator;

	// Database
	var db = config.db;

	if ( !db ){
		var MongoClient = require('mongodb').MongoClient,
			Server = require('mongodb').Server;
//		var myURI = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || config.mongodb.host + ':' + config.mongodb.port;	//Idea taken from: https://devcenter.heroku.com/articles/getting-started-with-nodejs#using-mongodb
//		var splitURI = myURI.split(":");	//
//		console.log("Conecting to the database in: " + myURI);
		
		if(!(process.env.MONGOLAB_URI || process.env.MONGOHQ_URL)){				//This part of code will be ran when running this server locally without any environmental var like MONGOHQ_URL or MONGOLAB_URI
			var mongoClient = new MongoClient( new Server(config.mongodb.host, config.mongodb.port));
			mongoClient.open( function( err, mongoClient ){
				db = mongoClient.db(config.mongodb.database);
				initCollections( db );
			});
		}else{
			/*  //not working
			var myURI = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL;
			console.log("Conecting to the remote database in: " + myURI);
			var splitURI = myURI.split(":");	//The URI will be like mongodb://user:password@troup.mongohq.com:10091/databasename
			console.log("Remote host: " + splitURI[0] + ':' + splitURI[1] + ':' + splitURI[2]);
			console.log("Remote port: " + splitURI[3].split("/")[0]);
			console.log("");
			var mongoClient = new MongoClient( new Server(splitURI[0] + ':' + splitURI[1] + ':' + splitURI[2], splitURI[3].split("/")[0]));	
			*/
			
			//Other try. http://stackoverflow.com/questions/20390967/setting-up-mongodb-on-heroku-with-node
			var myURI = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL;
			console.log("Connecting with the following database... " + myURI);
			MongoClient.connect(myURI, function (err, database) {
				if (err) throw err;
				db = database;
				if (db) console.log("Datastore.js: The database client has started the connection. Connected to database: " + db.getName());
				else console.log("Datastore.js: The database client could not start the connection. 'db' object not found.");
				initCollections( db );
//				users = db.collection("users");
//				accounts = db.collection("accounts");
				//var server = app.listen(process.env.PORT || 3000);
			});
			
		}
		
//		var mongoClient = new MongoClient( new Server(config.mongodb.host, config.mongodb.port));		//Original code
		/*mongoClient.open( function( err, mongoClient ){
			if (err)
				console.log("Unable to connect to the remote server. Error: " + err);
			db = mongoClient.db(config.mongodb.database);
			initCollections( db );
		});*/
	}
	else {
		initCollections( db );
	}

	function initCollections( db ){
		inputtraces = db.collection('inputtraces');
		logictraces = db.collection('logictraces');
		sessions = db.collection('sessions');
		usersessions = db.collection('usersessions');
		activeusers = db.collection('activeusers');
	}


	// Collections
	var inputtraces;
	/* Input traces MODEL
		{
			_id: ObjectID(),
			usersessionId: ObjectID(),
			timeStamp: ISODate(),
			device: 'some_device', // Predefined values: 'mouse', 'keyboard', 'screen'
			action: 'some_action', // Predefined values: 'move', 'press', 'release', 'click', 'drag'
			target: 'target_id' // An identifier of the in-game element that processed the input event, if any
			data: { key1: value, key2: value2, ...} // To pass additional arguments. A 'mouse' input would contain a x and y coordinates and the button
		}
	*/
	var logictraces;
	/* Logic traces MODEL
		{
			_id: ObjectID(),
			usersessionId: ObjectID(),
			timeStamp: some_timestamp,
			event: 'some_event', // Predefined values: 'game_start', 'game_end', 'game_quit', 'phase_start', 'phase_end', 'var_update'
			target: 'some_id', // See examples below to understand this fields
			data: { key1: value, key2: value2, ...}
		}
	 */
	var sessions;
	/* Session MODEL
		{
			_id: ObjectID(),
			name: 'Session Name',
			game: ObjectID(),
			owner: 'ownerName',
			enabled: true,
			authenticator: 'anonymous' | 'eadventure' | 'user'
		}
	 */
	var usersessions;
	/* User sessions MODEL
		{
			_id: ObjectID(),
			session: ObjectID(),
			userId: 'user1234',
			ip: '129.187.134.101'
		}
	 */
	var activeusers;
	/* Ative users MODEL
		{
			_id: ObjectID(),
			usersessionkey: '4kjilñkasiu3=',
			lastUpdate: ISODate(),
			usersessionId: ObjectID()
		}
	 */

	var startSession = function( req, sessionkey, cb ){
		// Check if it's a valid session key
		sessions.findOne({'sessionkey': sessionkey}, function( err, session ){
			if ( err ){
				cb(400);
			}
			else if (session && session.enabled ){
				var authenticator = getAuthenticator(session.authenticator || 'anonymous');
				authenticator.authenticate( req, function( err, userId ){
					if ( err ){
						cb( err );
						return;
					}
					// Create a new user session
					var usersession = {
						session: session._id,
						userId: userId,
						ip: req.header('x-forwarded-for') || req.connection.remoteAddress
					};

					usersessions.insert(usersession, function( err, results ){
						if (err) {
							cb( err );
						}
						else {
							// Check if the user is active in the same session
							activeusers.findOne({ userId: userId, usersessionId: session._id }, function ( err, activeuser ){
								if ( err ){
									cb( err );
								}
								else {
									var usersessionkey = SHA1.b64(new Date().toString() + ':' + userId + ":" + config.usersessionSalt + ":" + Math.random() );
									// if the user is active, revoke his old credentials
									if ( activeuser ){
										activeusers.update({_id: activeuser._id }, { $set: { usersessionkey: usersessionkey, usersessionId: session._id }}, function ( err, results ){
											cb( err, usersessionkey );
										});
									}
									else {
										var newActiveUser = {
											usersessionkey: usersessionkey,
											lastUpdate: new Date(),
											usersessionId: results[0]._id
										};
										activeusers.insert( newActiveUser, function( err, results ){
											cb( err, usersessionkey );
										});
									}
								}
							});
						}
					});
				});
			}
			else {
				cb(400);
			}
		});
	};

	var getAuthenticator = function( authenticator ){
		switch( authenticator ){
			case 'anonymous':
				return ipauthenticator;
			case 'eadventure':
				return eadauthenticator;
			case 'user':
				return userauthenticator;
			case 'nickname':
				return nicknameauthenticator;
			default:
				return ipauthenticator;
		}
	};

	var addTraces = function( req, traces, usersessionId, cb ){
		var logicTraces = [];
		var inputTraces = [];
		try {
			for (var i = 0; i < traces.length; i++) {
				var trace = traces[i];
				// Add usersessionId to traces
				trace.usersessionId = usersessionId;
				switch(traces[i].type){
					case 'logic':
					logicTraces.push(trace);
					break;
					case 'input':
					inputTraces.push(trace);
					break;
					default:
					// FIXME add it to some other table??
					break;
				}
				delete(trace.type);
			}
		} catch ( ex ){
			cb(400);
			return;
		}

		async.series([
			function( callback ){
				if ( logicTraces.length > 0 ){
					logictraces.insert(logicTraces, callback );
				}
				else {
					callback( null );
				}
			},
			function( callback ){
				if (inputTraces.length > 0){
					inputtraces.insert(inputTraces, callback);
				}
				else {
					callback(null);
				}
			}
			], cb );
	};

	var checkSessionKey = function( usersessionkey, cb ){
		activeusers.findOne({ usersessionkey: usersessionkey }, function( err, activeuser ){
			if ( activeuser ){
				activeusers.update({_id: activeuser._id}, {$set: { lastUpdate: new Date()}}, function( err ){
					cb(err, activeuser.usersessionId );
				});
			}
			else {
				cb(false);
			}
		});
	};

	var countTraces = function( usersessionId, cb ){
		logictraces.count({usersessionId: usersessionId}, function( err, count ){
			if ( err ){
				cb(err);
			}
			else {
				inputtraces.count( {usersessionId: usersessionId}, function( err, count2 ){
					cb( err, count + count2 );
				});
			}
		});
	};

	var removeTraces = function( usersessionIds, cb ){
		async.parallel([
			function( callback ){
				logictraces.remove({ usersessionId: { $in: usersessionIds } }, callback);
			},
			function( callback ){
				inputtraces.remove({ usersessionId: { $in: usersessionIds } }, callback);
			}
		], cb );
	};

	return {
		addTraces: addTraces,
		startSession: startSession,
		checkSessionKey: checkSessionKey,
		countTraces: countTraces,
		removeTraces: removeTraces
	};

};

module.exports = DataStore;