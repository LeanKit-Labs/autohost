require( '../setup' );
var requestor = require( 'request' ).defaults( { jar: true } );
var port = 8988;
var config = {
	port: port,
	socketio: true,
	websocket: true,
	defaultUser: true,
	handleRouteErrors: true
};

describe( 'AH Resource', function() {
	var harness, loggedOut;

	before( function() {
		harness = require( './harness.js' )( config );
		harness.metrics.useLocalAdapter();
		var testCall = function( env ) {
			env.reply( { data: 'hello' } );
		};

		var logout = function( env ) {
			env.logout();
			env.reply( { data: 'goodbye' } );
		};

		var errorCall = function( /* env */ ) {
			throw new Error( 'I am bad at things!' );
		};

		harness.addResource( {
			name: 'test',
			actions: {
				call: { url: '/call', method: 'get', topic: 'call', handle: testCall },
				error: { url: '/err', method: 'get', topic: 'err', handle: errorCall },
				logout: { url: '/logout', method: 'all', topic: 'logout', handle: logout }
			}
		} );
		harness.addResource( require( '../../src/ahResource' )( harness ) );
		harness.addMiddleware( '/api/test/call', function( req, res, next ) {
			loggedOut = true;
			next();
		} );
		harness.setActionRoles( 'test.call', [ 'user' ] );
		harness.start();
	} );

	describe( 'HTTP: metrics', function() {
		var metrics;
		var requests = [
			{
				url: 'http://localhost:8988/api/test/call',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:8988/api/test/call',
			},
			{
				url: 'http://localhost:8988/api/test/call',
			},
			{
				url: 'http://localhost:8988/api/test/err'
			},
			{
				url: 'http://localhost:8988/api/_ah/ah/metrics'
			},
			{
				url: 'http://localhost:8988/api/test/logout'
			}
		];
		var get = function( req ) {
			return function() {
				return when.promise( function( resolve ) {
					requestor.get( req, function( err, resp ) {
						if ( resp.body !== 'hello' && resp.body !== 'goodbye' && resp.statusCode === 200 ) {
							metrics = JSON.parse( resp.body );
						}
						resolve( err || resp );
					} );
				} );
			};
		};

		it( 'should have completed all requests successfully', function() {
			return seq( _.map( requests, get ) )
				.then( function( responses ) {
					return _.map( responses, 'statusCode' );
				} ).should.eventually.deep.equal( [ 200, 200, 200, 500, 200, 200 ] );
		} );

		it( 'should contain metrics under expected namespaces', function() {
			metrics.should.have.all.keys( [
				'autohost.ahspec.authentication',
				'autohost.ahspec.authorization',
				'autohost.ahspec.http.get.api.test.err',
				'autohost.ahspec.http.get.api.test.call',
				'autohost.ahspec.resource.http.test.call',
				'autohost.ahspec.resource.http.test.error'

			] );
		} );
	} );

	describe( 'Sockets: metrics', function() {
		var metrics, io;

		before( function( done ) {
			io = harness.getIOClient( 'http://localhost:8988', { query: 'token=one', reconnection: false } );
			io.once( 'finished', function() {
				setTimeout( function() {
					requestor.get(
						{
							url: 'http://localhost:8988/api/_ah/ah/metrics',
							headers: { 'Authorization': 'Bearer one' }
						}, function( err, resp ) {
							metrics = JSON.parse( resp.body );
							done();
						} );
				}, 100 );
			} );

			io.once( 'connect', function() {
				io.emit( 'test.call', { id: 100 } );
				io.emit( 'test.call', { id: 100 } );
				io.emit( 'test.call', { id: 100 } );
				io.emit( 'test.err', { id: 100 } );
				io.emit( 'test.call', { id: 100, replyTo: 'finished' } );
				io.emit( 'test.logout', { id: 100 } );
			} );
		} );

		it( 'should contain metrics under expected namespaces', function() {
			metrics.should.have.any.keys( [
				'autohost.ahspec.authentication',
				'autohost.ahspec.authorization',
				'autohost.ahspec.http.get.api._ah.ah.metrics',
				'autohost.ahspec.http.get.api.test.call',
				'autohost.ahspec.http.get.api.test.err',
				'autohost.ahspec.http.get.api.test.logout',
				'autohost.ahspec.resource.http.ah.metrics',
				'autohost.ahspec.resource.http.test.call',
				'autohost.ahspec.resource.http.test.error',
				'autohost.ahspec.resource.http.test.logout',
				'autohost.ahspec.resource.ws.test.call',
				'autohost.ahspec.resource.ws.test.err',
				'autohost.ahspec.resource.ws.test.logout'
			] );
		} );
	} );

	after( function() {
		harness.stop();
	} );
} );
