var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	requestor = require( 'request' ).defaults( { jar: false } ),
	WebSocketClient = require('websocket').client,
	metrics = require( 'cluster-metrics' ),
	when = require( 'when' ),
	port = 88988,
	config = {
		port: port,
		socketio: true,
		websocket: true
	},
	authProvider = require( '../auth/mock.js' )( config ),
	passport = require( '../../src/http/passport.js' )( config, authProvider, metrics ),
	middleware = require( '../../src/http/middleware.js' )( config, metrics ),
	http = require( '../../src/http/http.js' )( config, requestor, passport, middleware, metrics ),
	socket = require( '../../src/websocket/socket.js' )( config, http, middleware );

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
		/non-101 status: 401/.test( socketErr.toString() ).should.be.true;
	} );

	after( function() {
		socket.stop();
		http.stop();
	} );
} );