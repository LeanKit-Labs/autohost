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
var os = require( 'os' );
var hostName = os.hostname();
var harnessFn = require( '../../src/harness' );

describe( 'AH Resource', function() {
	var harness, loggedOut;

	before( function() {
		harness = harnessFn( config );
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
				call: { url: [ '/call', '/hollah' ], method: 'get', topic: 'call', handle: testCall },
				error: { url: '/err', method: 'get', topic: 'err', handle: errorCall },
				logout: { url: '/logout', method: 'all', topic: 'logout', handle: logout }
			}
		} );
		harness.addResource( require( '../../src/ahResource' )( harness ) );
		harness.addMiddleware( '/api/test/call', function( req, res, next ) {
			loggedOut = true;
			next();
		}, 'logout' );
		harness.setActionRoles( 'test.call', [ 'user' ] );
		harness.start();
	} );

	describe( 'HTTP: metrics', function() {
		var requests = [
			{
				url: 'http://localhost:8988/api/test/call',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:8988/api/test/call',
			},
			{
				url: 'http://localhost:8988/api/test/hollah',
			},
			{
				url: 'http://localhost:8988/api/test/err'
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
				} ).should.eventually.deep.equal( [ 200, 200, 200, 500, 200 ] );
		} );
	} );

	after( function() {
		harness.stop();
	} );
} );
