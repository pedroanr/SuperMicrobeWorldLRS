
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var collector = require('./gleanercollector/collector')();

/*collector.addFilter(function(req, reqbody, callback){
	if(reqbody && reqbody.lenght > 0){
		for(var i=0; i<reqbody.length; i++){
			if(reqbody[i].timestamp){
				reqbody[i].timestamp = new Date(reqbody[i].timestamp);
				callback(null, "Filter finished");
			}
		}
	}
});*/

//var testutils = require('./testutils')();

var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3030);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
//app.use('/', express.static(path.join(__dirname, 'game'))); /*---new----*/
// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//app.get('/', routes.index);
app.get('/', function(request, response) {
	console.log("Serving build.html...");
	response.status(200).sendfile('./public/game/build.html');
});
app.post('/start/:gamekey', collector.start);
app.get('/users', user.list);
app.get('/crossdomain.xml', function(request, response) {
	request.headers['if-none-match'] = 'no-match-for-this';	//To avoid caching the file
	console.log("Serving crossdomain.xml...");
	response.status(200).sendfile('./crossdomain.xml');
});
app.get('/build.unity3d', function(request, response) {
	console.log("Serving build.unity3d...");
	response.status(200).sendfile('./public/game/build.unity3d');
});

/*vvvvvvvvvv for testing purposes only vvvvvvvvvv*/

//app.get('/test', testutils.returnback);
//app.post('/test', testutils.returnback);

/*^^^^^^^^^^ for testing purposes only ^^^^^^^^^^*/

app.post('/track', collector.track); //to handle the post of tracks
//app.post('/getround', collector.getround);	//To return the xml for the rounds and track the beginning of the quiz level

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
