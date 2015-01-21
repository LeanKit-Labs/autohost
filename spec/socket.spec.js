var should = require( 'should' ); //jshint ignore:line
var port = 88988;
var config = {
	port: port,
	socketio: true,
	websocket: true,
	defaultUser: true,
	handleRouteErrors: true
};

describe( 'Socket Management', function() {
	var harness;

	before( function() {
		harness = require( './harness.js' )( config );
		harness.addUser( 'usertwo', 'two', 'two', [] );
		harness.start();
	} );

	describe( 'with multiple socket clients', function() {
		var io, ws, ioC, wsC;

		before( function( done ) {
			function check() {
				if ( ioC && wsC ) {
					done();
				}
			}

			io = harness.getIOClient( 'http://localhost:88988', { query: 'token=one', reconnection: false } );
			io.once( 'connect', function() {
				ioC = true;
				check();
			} );

			ws = harness.getWSClient( 'http://localhost:88988/websocket', { Authorization: 'Bearer two' } );
			ws.once( 'connect', function( c ) {
				wsC = c;
				check();
			} );
		} );

		describe( 'when notifying clients', function() {
			var ioMessages = [];
			var wsMessages = [];
			var onWSMessage;

			before( function( done ) {
				function check() {
					if ( ioMessages.length && wsMessages.length ) {
						done();
					}
				}

				onWSMessage = function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'broadcast' ) {
						wsMessages.push( json.data );
						check();
					}
				};

				wsC.on( 'message', onWSMessage );

				io.once( 'broadcast', function( msg ) {
					ioMessages.push( msg );
					check();
				} );

				harness.socket.notify( 'broadcast', { message: 'behold, an broadcast!' } );
			} );

			it( 'should send messages to all connected clients', function() {
				ioMessages.should.eql( [ { message: 'behold, an broadcast!' } ] );
				wsMessages.should.eql( [ { message: 'behold, an broadcast!' } ] );
			} );
		} );

		describe( 'when sending to a specific client', function() {
			var ioMessages = [];
			var wsMessages = [];
			var onWSMessage;

			before( function( done ) {
				function check() {
					if ( ioMessages.length && wsMessages.length ) {
						done();
					}
				}

				onWSMessage = function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'specific' ) {
						wsMessages.push( json.data );
						check();
					}
				};

				wsC.on( 'message', onWSMessage );

				io.once( 'specific', function( msg ) {
					ioMessages.push( msg );
					check();
				} );

				harness.socket.send( 'userone', 'specific', { message: 'sent to userone' } );
				harness.socket.send( 'usertwo', 'specific', { message: 'sent to usertwo' } );
			} );

			it( 'should send messages to all connected clients', function() {
				ioMessages.should.eql( [ { message: 'sent to userone' } ] );
				wsMessages.should.eql( [ { message: 'sent to usertwo' } ] );
			} );
		} );
	} );

	after( function() {
		harness.stop();
	} );
} );
