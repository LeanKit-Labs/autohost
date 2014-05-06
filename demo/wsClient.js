var sys = require("sys");
var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();

var stdin = process.openStdin();

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

var timeoutHandle = undefined;
var g_connect = null;
var retryConnect = function() {
    client.connect('ws://localhost:8800/');
};

stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that  
    // with toString() and then substring() 
    console.log("you entered: [" + 
        d.toString().substring(0, d.length-1) + "]");

    g_connect.sendUTF( JSON.stringify( { topic: 'anon.chat', body: d.toString() } ) );
});

client.on('connect', function(connection) {
    g_connect = connection;
    connection.sendUTF( JSON.stringify( { topic: 'client.identity', body: { id: 'console-client' } } ) );
    if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
    }
    console.log('WebSocket client connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
        timeoutHandle = setTimeout(retryConnect, 5000);
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
        timeoutHandle = setTimeout(retryConnect, 5000);
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {

            console.log("Received from server: '" + JSON.stringify( message.utf8Data ) + "'");
        }
    });

});

client.connect('ws://admin:admin@localhost:8800/', 'echo-protocol', 'console', { 'Authorization': 'Basic YWRtaW46YWRtaW4='});