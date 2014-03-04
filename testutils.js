/** 
 * 
 */
var testutils = function(){

	/*var myStringToJson = function(res, req, cb) {
		console.log("Json to parse: "+ req);
		try{
			req = JSON.parse(req);
		}
		catch(err){
			cb(err);
		}
		finally{
			console.log("Parsed: "+ req);
		}
	};*/
	
	var returnback = function(req, res){
		toreturn = "\nReturned: \n";
		if (req.headers.authorization) toreturn += "Header (Authorization): " + req.headers.authorization;
		if (req.body && req.body !== []) toreturn += "\nBody: " + req.body;
		/*if(err){
			res.status(500);
			res.send("Error in 'returnback' function");
			return;
		}	
		else{*/
			res.status(200);
			res.send(toreturn);
		//}
	};

	return {
		returnback: returnback
	};
};

module.exports = testutils;