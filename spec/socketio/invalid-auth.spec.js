var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	requestor = require( 'request' ).defaults( { jar: false } ),
	debug = require( 'debug' )( 'autohost-spec:invalid-auth' ),
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

describe( 'with failed socket.io credentials', function() {
	var socketErr,
		client;

	before( function( done ) {
		http.start();
		socket.start( passport );
		var io = require( 'socket.io-client' );
		client = io( 'http://localhost:88988', { query: 'token=blorp' } );
		client.once( 'connect_error', function( data ) {
			socketErr = data;
			done();
		} );

		var events = [ 
			'connect',
			'connect_error',
			'connect_timeout',
			'reconnect',
			'reconnect_attempt',
			'reconnecting',
			'reconnect_error',
			'reconnect_failed'
		];

		_.each( events, function( ev ) {
			client.on( ev, function( d ) { debug( '%s JUST. HAPPENED. %s', ev, d ); } );
		} );
	} );

	it( 'should get a connection error', function() {
		socketErr.toString().should.equal( 'Error: xhr poll error' );
	} );

	it( 'should disconnect the socket', function() {
		client.connected.should.be.false;
	} );

	after( function() {
		client.io.close();
		client.removeAllListeners();
		socket.stop();
		http.stop();
	} );
} );