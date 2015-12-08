var http = require("http");
var url = require("url");
var os = require("os");
var fs = require("fs");

// Write the message in a temporary file
//
// Haraka message stream does not support anything other than the pipe
// implementation as a StreamReadable object but we don't want to sent chunked
// data over HTTP as some HTTP server (e.g. Puma in ruby) does not support it
// correctly. As a workaround we store the message in a temporary file to be
// able to get the byte lenth of the message before transferring it over HTTP.
//
//  The callback function return two arguments:
//  * err: any error that occur during the reception of the message
//  * messageFilePath: the path to the temporary file where the message is
//    stored
var receiveMessage = function(connection, callback) {
  var tmp = os.tmpdir();
  var messageStream = connection.transaction.message_stream;
  var messageFilePath = tmp + "/" + connection.transaction.uuid;
  var messageFile = fs.createWriteStream(messageFilePath);

  messageStream.once("error", function(err) {
    return callback("(message stream) " + err);
  });

  messageFile.once("error", function(err) {
    return callback("(message file) " + err);
  });

  messageFile.once("close", function () {
      return callback(null, messageFilePath);
  });

  messageStream.pipe(messageFile);
};

// Deliver a message to the given URL
//
// Submit the message in a non chunked way to the destination URL.
// The message is POSTed in plain text.
var deliverMessage = function(messageFilePath, webhookURL, callback) {
  var httpEndpoint = url.parse(webhookURL);
  var messageLength = fs.statSync(messageFilePath)["size"];
  var messageFile = fs.createReadStream(messageFilePath);

  var request = http.request({
    protocol: httpEndpoint.protocol,
    host: httpEndpoint.hostname,
    port: httpEndpoint.port,
    path: httpEndpoint.path,
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": messageLength
    }
  });

  messageFile.once("error", function(err) {
    return callback("(message file) " + err);
  });

  request.once("error", function(err) {
    return callback("(request) " + err)
  });

  request.once("response", function(response) {
    var text = "";

    response.on("data", function(chunk) {
      text += chunk;
    });

    response.on("end", function() {
      var result = {success: response.statusCode == 200, text: text};
      return callback(null, result);
    });
  });

  messageFile.pipe(request);
}

exports.hook_queue = function(next, connection) {
  var webhookURL = this.config.get("webhook_url") || "http://localhost";

  receiveMessage(connection, function(err, messageFilePath) {

    if (err) {
      connection.logerror(err);
      return next(DENYSOFT, "An error prevented the reception of the message");
    }

    deliverMessage(messageFilePath, webhookURL, function(err, result) {

      if (err) {
        connection.logerror(err);
        return next(DENYSOFT, "An error prevented the delivery of the message");
      }

      return next((result.success) ? OK : DENY, result.text);
    });
  });
};
