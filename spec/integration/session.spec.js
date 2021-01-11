require( '../setup' );
var requestor = require( 'request' ).defaults( { jar: true } );
var postal = require( 'postal' );
var events = postal.channel( 'events' );
var port = 8988;
var config = {
	port: port,
	socketio: true,
	websocket: true,
	defaultUser: true
};
var post, get;
var harnessFn = require( '../../src/harness' );

describe( 'Session Management', function() {
	var harness, loggedOut;

	before( function() {
		harness = harnessFn( config );
		var testCall = function( env ) {
			env.reply( { data: 'hello' } );
		};
		var logout = function( env ) {
			env.logout();
			env.reply( { data: 'session ended' } );
		};
		harness.addResource( {
			name: 'test',
			actions: {
				call: { url: '/call', method: 'get', topic: 'call', handle: testCall },
				logout: { url: '/logout', method: 'all', topic: 'logout', handle: logout },
			}
		} );
		harness.addMiddleware( '/api/test/logout', function logout( req, res, next ) {
			loggedOut = true;
			next();
		} );
		harness.setActionRoles( 'test.call', [ 'user' ] );
		harness.start();
		get = function( req ) {
			return when.promise( function( resolve, reject ) {
				requestor.get( req, function( err, res ) {
					if ( err ) {
						reject( err );
					} else {
						resolve( res );
					}
				} );
			} );
		};
		post = lift( requestor.post );
	} );

	describe( 'HTTP: when making requests before and after logout', function() {
		var counter = 0;
		var originalAuthenticate;
		var requests = [
			{
				url: 'http://localhost:8988/api/test/call',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:8988/api/test/call',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:8988/api/test/call',
			},
			{
				url: 'http://localhost:8988/api/test/logout'
			},
			{
				url: 'http://localhost:8988/api/test/call'
			}
		];
		var getFn = function( req ) {
			return function() {
				return get( req );
			};
		};

		before( function() {
			originalAuthenticate = harness.auth.authenticate;
			harness.auth.authenticate = function( req, res, next ) {
				// don't count the call after logout
				if ( !loggedOut ) {
					counter = counter + 1;
				}
				originalAuthenticate( req, res, next );
			};

		} );

		it( 'should have completed all requests successfully', function() {
			return seq( _.map( requests, getFn ) )
				.then( function( responses ) {
					return _.map( responses, 'statusCode' );
				} )
				.should.eventually.deep.equal( [ 200, 200, 200, 200, 401 ] );
		} );

		it( 'should not authenticate requests once session is established', function() {
			counter.should.be.lessThan( 2 );
		} );

		after( function() {
			harness.auth.authenticate = originalAuthenticate;
		} );
	} );

	describe( 'Socket.io: when logging out via socket', function() {
		var responses = [];
		var initialUser, initialRoles, loggedOutUser, loggedOutRoles;
		var disconnected;

		before( function( done ) {

			var io = harness.getIOClient( 'http://localhost:8988?token=one', { query: 'token=one' } );
			io.once( 'test.call', function( msg ) {
				responses.push( msg );
				io.emit( 'test.logout', { thing: 'whatever' } );
			} );
			io.on( 'connect', function() {
				io.emit( 'test.call', { thing: 'whatever' } );
			} );
			events.subscribe( 'socket.client.connected', function( c ) {
				initialUser = c.socket.user.name;
				initialRoles = c.socket.user.roles;
			} );
			events.subscribe( 'socket.client.closed', function( c ) {
				if ( !disconnected ) {
					disconnected = true;
					loggedOutUser = c.socket.user.name;
					loggedOutRoles = c.socket.user.roles;
					done();
				}
			} );
			io.open();
		} );

		it( 'should have attached the correct user on connect', function() {
			initialUser.should.equal( 'userone' );
		} );

		it( 'should have attached the correct user roles on connect', function() {
			initialRoles.should.eql( [ 'user' ] );
		} );

		it( 'should report correct user with socket disconnection', function() {
			loggedOutUser.should.equal( 'userone' );
		} );

		it( 'should report correct roles socket disconnection', function() {
			loggedOutRoles.should.eql( [ 'user' ] );
		} );

		it( 'should completed request', function() {
			responses.should.eql( [ 'hello' ] );
		} );

		it( 'should have closed socket', function() {} );
	} );

	after( function() {
		harness.stop();
	} );
} );
