/**
 * http-server.js
 *
 * Minimal TCP-based HTTP server for Lens Studio plugins.
 * Serves the viewer HTML so that Ui.WebEngineView can load it via http://localhost:PORT/.
 *
 * Uses LensStudio:Network TcpServer since Node.js http module is not available
 * in the plugin environment. Only needs to serve a single file.
 */

import * as Network from "LensStudio:Network";
import { VIEWER_HTML } from "./viewer-html.js";

var tcpServer = null;
var sockets = [];      // prevent GC of active sockets
var connections = [];   // prevent GC of event connections
var htmlContent = VIEWER_HTML;
// Compute UTF-8 byte length (String.length counts characters, not bytes)
var htmlBytes = 0;
for (var ci = 0; ci < htmlContent.length; ci++) {
  var code = htmlContent.charCodeAt(ci);
  if (code <= 0x7f) htmlBytes += 1;
  else if (code <= 0x7ff) htmlBytes += 2;
  else if (code >= 0xd800 && code <= 0xdbff) { htmlBytes += 4; ci++; } // surrogate pair
  else htmlBytes += 3;
}

/**
 * Start a minimal HTTP server that serves the viewer.
 *
 * @returns {number} The port the server is listening on
 */
export function startHttpServer() {

  tcpServer = Network.TcpServer.create();

  var connectConn = tcpServer.onConnect.connect(function (socket) {
    sockets.push(socket);
    var requestData = "";
    var socketConns = [];

    function cleanupSocket() {
      var idx = sockets.indexOf(socket);
      if (idx !== -1) sockets.splice(idx, 1);
      // Remove from connections array to allow GC (don't call .disconnect() —
      // we're inside a signal handler and that crashes LS's native dispatch)
      for (var i = 0; i < socketConns.length; i++) {
        var ci = connections.indexOf(socketConns[i]);
        if (ci !== -1) connections.splice(ci, 1);
      }
      socketConns = [];
    }

    var dataConn = socket.onData.connect(function (buffer) {
      requestData += buffer.toString();
      if (requestData.indexOf("\r\n\r\n") === -1) return;

      var firstLine = requestData.split("\r\n")[0];
      var parts = firstLine.split(" ");
      var method = parts[0] || "";
      var path = parts[1] || "/";

      if (method === "GET" && (path === "/" || path.indexOf("/?") === 0 || path === "/index.html")) {
        var response =
          "HTTP/1.1 200 OK\r\n" +
          "Content-Type: text/html; charset=utf-8\r\n" +
          "Content-Length: " + htmlBytes + "\r\n" +
          "Cache-Control: no-cache\r\n" +
          "Access-Control-Allow-Origin: *\r\n" +
          "Connection: close\r\n" +
          "\r\n" +
          htmlContent;
        try { socket.write(response); } catch (e) {}
      } else {
        var body = "Not Found";
        var notFound =
          "HTTP/1.1 404 Not Found\r\n" +
          "Content-Length: " + body.length + "\r\n" +
          "Connection: close\r\n" +
          "\r\n" +
          body;
        try { socket.write(notFound); } catch (e) {}
      }
    });
    socketConns.push(dataConn);
    connections.push(dataConn);

    var endConn = socket.onEnd.connect(function () { cleanupSocket(); });
    socketConns.push(endConn);
    connections.push(endConn);

    var errConn = socket.onError.connect(function () { cleanupSocket(); });
    socketConns.push(errConn);
    connections.push(errConn);
  });
  connections.push(connectConn);

  // Listen on auto-assigned port
  var addr = new Network.Address();
  addr.address = "127.0.0.1";
  addr.port = 0;

  try {
    tcpServer.listen(addr);
    console.log("[scene-inspector] HTTP server on port " + tcpServer.port);
  } catch (e) {
    console.error("[scene-inspector] Failed to start HTTP server: " + e);
    return 0;
  }

  return tcpServer.port;
}

/**
 * Stop the HTTP server and clean up.
 */
export function stopHttpServer() {
  connections.forEach(function (c) {
    try { c.disconnect(); } catch (e) {}
  });
  connections = [];
  sockets = [];
  if (tcpServer) {
    try { tcpServer.close(); } catch (e) {}
    tcpServer = null;
  }
}
