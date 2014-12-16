var should = require( 'should' ); //jshint ignore:line
var requestor = require( 'request' ).defaults( { jar: false } );
var WebSocketClient = require('websocket').client;
var metrics = require( 'cluster-metrics' );
var port = 88988;
var config = {
		port: port,
		origin: 'console',
		socketIO: true,
		websocket: true
	};

var middleware, http, socket;

describe( 'with websocket and no auth strategy', function() {
	var client,
		clientSocket;

	before( function( done ) {
		middleware = require( '../../src/http/middleware.js' )( metrics );
		middleware.configure( config );
		http = require( '../../src/http/http.js' )( requestor, middleware, metrics );
		socket = require( '../../src/websocket/socket.js' )( config, http );

		http.start( config );
		socket.start();
		
		client = new WebSocketClient();
		
		client.connect(
			'http://localhost:88988/websocket',
			'echo-protocol', 
			'console'
		);

		client.once( 'connect', function( cs ) {
			clientSocket = cs;
			done();
		} );
	} );

	describe( 'when exchanging messages', function() {
		var fromClient,
			fromServer;

		before( function( done ) {
			socket.on( 'client.message', function( msg, client ) {
				fromClient = msg;
				client.publish( msg.replyTo, { txt: 'hulloo!' } );
			} );

			clientSocket.once( 'message', function( msg ) {
				var json = JSON.parse( msg.utf8Data );
				if( json.topic === 'server.message' ) {
					fromServer = json;
					done();
				}
			} );

			clientSocket.sendUTF( JSON.stringify( { 
				topic: 'client.message', 
				data: { txt: 'ohhai', replyTo: 'server.message' } 
			} ) );
		} );

		it( 'should get client message', function() {
			fromClient.should.eql( { txt: 'ohhai', replyTo: 'server.message' } );
		} );

		it( 'should get server response', function() {
			fromServer.should.eql( { topic: 'server.message', data: { txt: 'hulloo!' } } );
		} );

		it( 'should have a connected socket', function() {
			clientSocket.connected.should.be.true; //jshint ignore:line
		} );
	} );

	after( function() {
		socket.stop();
		http.stop();
	} );
} );