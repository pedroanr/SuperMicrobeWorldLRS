var GleanerCollector = function( externalConfiguration ){
	var async = require('async');

	var configuration = require('./defaultconfig.js');
	// Override default configuration
	if ( externalConfiguration ){
		for ( var att in externalConfiguration ){
			configuration[att] = externalConfiguration[att];
		}
	}

	var dataStore = configuration.usemysql ? new require('./datastore-mysql.js')(configuration) : new require('./datastore.js')(configuration);
	var filters = [];

	var addFilter = function( filter ){
		filters.push(filter);
	};
	
	// Start tracking request
	var start = function(req, res){
		var sessionkey = req.url.substr(req.url.lastIndexOf('/') + 1);
		dataStore.startSession( req, sessionkey, function( err, usersessionkey ){
			if (err){
				console.log("*******collector.start********Unauthorized start request...");
				console.log(err);
				res.send(401);
			}
			else {
				if ( usersessionkey ){
					console.log("Start request succesfully done!");
					res.status(200);
					/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
					res.send({ sessionKey: usersessionkey });
				}
				else {
					res.send(401);
				}
			}
		});
	};

	// Receive traces
	var track = function(req, res){
		dataStore.checkSessionKey( req.headers.authorization, function( err, usersessionId ){
			if (err || !usersessionId){
				res.send(401);
				return;
			}

			// Check that body is at least has length
			if ( req.body && req.body.length > 0 ){
				if ( filters.length > 0 ){
					var filtersApply = [];
					// Apply filters to traces. Filters transform req.body
					for (var i = 0; i < filters.length; i++) {
						filtersApply.push(async.apply(filters[i], req, req.body ));
					}

					async.series( filtersApply, function( err, results ){
						if ( err ){
							res.send(400);
						}
						else {
							// When filters are done, we add the traces
							/*for(var i=0; i<req.body.length; i++){
								if(req.body[i].timestamp){
									var dateToStore = new Date(req.body[i].timestamp);
									console.log(dateToStore.toString());
									req.body[i].timestamp = dateToStore;
								}
							}*/
							dataStore.addTraces( req, req.body, function( err ){
								res.send( err ? 400 : 204 );
							});
						}
					});
				} else {
					//This for loop converts all the timestamps from Strings to Dates. 
					//The received timestamps has to be formatted as ISO 8601 date format example: 1994-11-05T13:15:30.256Z (Z is to designate UTC Hour and T is to separate the time and the date)
					//If not, an exception will be thrown.
					for(var i=0; i<req.body.length; i++){
						if(req.body[i].timestamp){
							var dateToStore = new Date(req.body[i].timestamp);
							//console.log(dateToStore.toString());
							req.body[i].timestamp = dateToStore;
						}
					}
					dataStore.addTraces( req, req.body, usersessionId, function( err ){
						res.send( err ? 400 : 204 );
					});
				}
			}
			else {
				res.send(204);
			}
		} );
	};
	
	// Track the start of a quiz level and returns the questions 
	var getround = function(req, res){
		dataStore.checkSessionKey( req.headers.authorization, function( err, usersessionId ){
			if (err || !usersessionId){
				res.send(401);
				return;
			}

			// Check that body at least has length
			if ( req.body && req.body.length > 0 ){
				if ( filters.length > 0 ){
					var filtersApply = [];
					// Apply filters to traces. Filters transform req.body
					for (var i = 0; i < filters.length; i++) {
						filtersApply.push(async.apply(filters[i], req, req.body ));
					}

					async.series( filtersApply, function( err, results ){
						if ( err ){
							res.send(400);
						}
						else {
							// When filters are done, we add the traces
							/*for(var i=0; i<req.body.length; i++){
								if(req.body[i].timestamp){
									var dateToStore = new Date(req.body[i].timestamp);
									console.log(dateToStore.toString());
									req.body[i].timestamp = dateToStore;
								}
							}*/
							dataStore.addTraces( req, req.body, function( err ){
								res.send( err ? 400 : 204 );
							});
						}
					});
				} else {
					//This for loop converts all the timestamps from Strings to Dates. 
					//The received timestamps has to be formatted as ISO 8601 date format example: 1994-11-05T13:15:30.256Z (Z is to designate UTC Hour and T is to separate the time and the date)
					//If not, an exception will be thrown.
					for(var i=0; i<req.body.length; i++){
						if(req.body[i].timestamp){
							var dateToStore = new Date(req.body[i].timestamp);
							//console.log(dateToStore.toString());
							req.body[i].timestamp = dateToStore;
						}
					}
					dataStore.addTraces( req, req.body, usersessionId, function( err ){
						if(err){
							res.send( 400 );
						}
						else{
							if (req.body[0].round){
								res.status( 200 );
								var textToSend = "";
								var xmlPath = "";
								switch(req.body[0].round){
								case "0":
									xmlPath = './QuizRounds/en_en_gameshow_round1.xml';
									break;
								case "1":
									xmlPath = './QuizRounds/en_en_gameshow_round2.xml';
									break;
								case "2":
									xmlPath = './QuizRounds/en_en_gameshow_round3.xml';
									break;
								case "3":
									xmlPath = './QuizRounds/en_en_gameshow_round4.xml';
									break;
								case "4":
									xmlPath = './QuizRounds/en_en_gameshow_round5.xml';
									break;
								default:
									textToSend = "The round asked does not exist.";
								}
								fs = require('fs');
								fs.readFile(xmlPath, 'utf8', function (err,textToSend) {
								  if (err) {
								    return console.log(err);
								  }
								  //console.log(data);
								  res.send({ round: textToSend });
								  console.log("Jan27: Data tracked correctly. Returning xml text");
								});
							}
							else {
								res.send( 400 );
								console.log("Error: The body didn't specify the number of round asked in the 'round' field.");
							}
						}
						//res.send( err ? 400 : 204 );
					});
				}
			}
			else {
				res.send(204);
			}
		} );
	};

	var countTraces = function( usersessionId, cb ){
		dataStore.countTraces( usersessionId, cb );
	};

	var removeTraces = function( usersessionIds, cb ){
		dataStore.removeTraces( usersessionIds, cb);
	};

	return {
		start: start,
		track: track,
		getround : getround,
		addFilter: addFilter,
		countTraces: countTraces,
		removeTraces: removeTraces
	};
};

module.exports = GleanerCollector;