var http = require('http');

var handleRequest = function(req, res) {
  var data = "";

  req.on("data", function (chunk) {
    data += chunk;
  });

  req.on("end", function() {
    res.end();
    console.log("\n> Received " + req.method + " on " + req.url);
    console.log(data);
  });
}

var server = http.createServer(handleRequest);

server.listen(8080, function() {
  console.log(">> Server listening on localhost at port 8080");
  console.log(">> http://localhost:8080");
});
