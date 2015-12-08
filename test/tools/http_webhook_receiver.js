var http = require('http');

var handleRequest = function(req, res) {
  var data = "";

  req.on("data", function (chunk) {
    data += chunk;
  });

  req.on("end", function() {
    console.log("\n> Received " + req.method + " on " + req.url);
    for(var field in req.headers) {
      console.log("* " + field + ": " + req.headers[field])
    }
    console.log(data);

    switch(req.url) {
      case "/unauthorized":
        res.statusCode = 401;
        res.write("Unauthorized");
        break;
      default:
        res.statusCode = 200;
        res.write("OK");
    };

    res.end();
  });
}

var server = http.createServer(handleRequest);

server.listen(8080, function() {
  console.log(">> Server listening on localhost at port 8080");
  console.log(">> http://localhost:8080");
});
