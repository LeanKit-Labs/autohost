var should = require( 'should' ); //jshint ignore:line
var requestor = require( 'request' ).defaults( { jar: false } );
var WebSocketClient = require('websocket').client;
var metrics = require( 'cluster-metrics' );
var port = 88988;
var config = {
		port: port,
		socketio: true,
		websocket: true
	};
var authProvider = require( '../auth/mock.js' )( config );
var passport = require( '../../src/http/passport.js' )( config, authProvider, metrics );
var middleware = require( '../../src/http/middleware.js' )( config, metrics );
var http = require( '../../src/http/http.js' )( config, requestor, passport, middleware, metrics );
var socket = require( '../../src/websocket/socket.js' )( config, http, middleware );

authProvider.users[ 'test' ] = { user: 'torpald' };

describe( 'with websocket and bad credentials', function() {
	var socketErr,
		client;

	before( function( done ) {
		http.start();
		socket.start( passport );
		client = new WebSocketClient();
		client.connect(
			'http://localhost:88988/websocket',
			'echo-protocol', 
			'console', 
			{ 'Authentication': 'Basic fail' }
		);
		client.once( 'connectFailed', function( error ) {
			socketErr = error;
			done();
		} );
	} );

	it( 'should get a connection error', function() {
		/non-101 status: 401/.test( socketErr.toString() ).should.be.true; //jshint ignore:line
	} );

	after( function() {
		socket.stop();
		http.stop();
	} );
} );