var http = require("http");
var url = require('url');

var util = require('util');

exports.hook_queue = function(next, connection) {
  var config = this.config.get("webhook_url") || "http://localhost";
  var httpEndpoint = url.parse(config);
  var message = connection.transaction.message_stream;

  var request = http.request({
    protocol: httpEndpoint.protocol,
    host: httpEndpoint.hostname,
    port: httpEndpoint.port,
    path: httpEndpoint.path,
    method: "POST",
  });

  request.once("response", function(res) {
    next(OK);
  });

  request.once("error", function(res) {
    connection.logerror("webhook URL not reachable");
    next(DENYSOFT);
  });

  message.pipe(request);

  message.on("end", function() {
    request.end();
  });
};
