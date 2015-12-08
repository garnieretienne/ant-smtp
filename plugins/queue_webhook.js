var http = require("http");
var url = require('url');

var util = require('util');

exports.hook_queue = function(next, connection) {
  var webhookURL = this.config.get("webhook_url") || "http://localhost";
  var httpEndpoint = url.parse(webhookURL);
  var message = connection.transaction.message_stream;

  var request = http.request({
    protocol: httpEndpoint.protocol,
    host: httpEndpoint.hostname,
    port: httpEndpoint.port,
    path: httpEndpoint.path,
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked"
    }
  });

  request.once("response", function(response) {
    var text = "";

    response.on("data", function(chunk) {
      text += chunk;
    });

    response.on("end", function() {
      response.statusCode == 200 ? next(OK) : next(DENY, text);
    });
  });

  request.once("error", function(res) {
    connection.logerror("webhook url not reachable");
    next(DENYSOFT);
  });

  message.pipe(request);

  message.on("end", function() {
    request.end();
  });
};
