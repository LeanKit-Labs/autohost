var should = require( 'should' );  //jshint ignore:line
var requestor = require( 'request' ).defaults( { jar: true } );
var metrics = require( 'cluster-metrics' );
var port = 88988;
var config = {
		port: port,
		anonymous: [ '/api/forward' ]
	};
var authProvider = require( './auth/mock.js' )( config );
var passport = require( '../src/http/passport.js' )( config, authProvider, metrics );
var middleware = require( '../src/http/middleware.js' )( config, metrics );
var http = require( '../src/http/http.js' )( config, requestor, passport, middleware, metrics );
var httpAdapter = require( '../src/http/adapter.js' )( config, authProvider, http, requestor, metrics );
var actionRoles = function( action, roles ) {
		authProvider.actions[ action ] = { roles: roles };
	};
var userRoles = function( user, roles ) {
		authProvider.users[ user ].roles = roles;
	};

describe( 'with http adapter', function() {
	var cleanup = function() {
			userRoles( 'userman', [] );
			actionRoles( 'test.call', [] );
			actionRoles( 'test.forward', [] );
		};

	before( function() {
		authProvider.tokens = { 'blorp': 'userman' };
		authProvider.users = { 'userman': { name: 'userman', password: 'hi', roles: [] } };
		httpAdapter.action( { name: 'test' }, {
			alias: 'call',
			verb: 'get',
			path: '/call/:one/:two',
			handle: function( env ) {
				env.reply( { data: 'ta-da!' } );
			}
		}, { routes: {} } );

		httpAdapter.action( { name: 'test' }, {
			alias: 'forward',
			verb: 'get',
			path: '/forward/:one/:two',
			handle: function( env ) {
				env.forwardTo( {
					url: 'http://userman:herp@localhost:88988/api/test/call/10/20'
				} );
			}
		}, { routes: {} } );

		// a resource that crashes
		httpAdapter.action( { name: 'test' }, {
			alias: 'bomb',
			verb: 'get',
			path: '/bomb',
			handle: function( env ) {
				boom();
			}
		}, { routes: {} } );

		http.start();
	} );

	describe( 'when making a request with inadequate permissions', function() {
		var result;

		before( function( done ) {
			actionRoles( 'test.call', [ 'admin' ] );
			userRoles( 'userman', [ 'guest' ] );
			requestor.get( {
				url: 'http://userman:hi@localhost:88988/api/test/call/10/20'
			}, function( err, resp ) {
				result = resp;
				done();
			} );
		} );

		it( 'should tell user to take a hike', function() {
			result.body.should.equal( 'User lacks sufficient permissions' );
		} );

		it( 'should return 403', function() {
			result.statusCode.should.equal( 403 );
		} );

		after( cleanup );
	} );

	describe( 'when making a request with adequate permissions', function() {
		var result;

		before( function( done ) {
			actionRoles( 'test.call', [ 'guest' ] );
			userRoles( 'userman', [ 'guest' ] );
			requestor.get( {
				url: 'http://localhost:88988/api/test/call/10/20',
				headers: {
					'Authorization': 'Bearer blorp'
				}
			}, function( err, resp ) {
				result = new Buffer( resp.body, 'utf-8' ).toString();
				done();
			} );
		} );

		it( 'should return action response', function() {
			result.should.equal( 'ta-da!' );
		} );

		after( cleanup );
	} );

	describe( 'when forwarding a request from an anonymous endpoint', function() {
		var result;

		before( function( done ) {
			actionRoles( 'test.call', [ 'guest' ] );
			userRoles( 'userman', [ 'guest' ] );
			requestor.get( {
				url: 'http://localhost:88988/api/test/forward/10/20'
			}, function( err, resp ) {
				result = new Buffer( resp.body, 'utf-8' ).toString();
			});
		});

		it( 'should return action response', function() {
			result.should.equal( 'ta-da!' );
		} );

		after( cleanup );

	});

	describe( 'when making a request to a resource that throws an unhandled exception', function() {
		var result;

		before( function( done ) {
			actionRoles( 'test.bomb', [ 'guest' ] );
			userRoles( 'userman', [ 'guest' ] );
			requestor.get( {
				url: 'http://localhost:88988/api/test/bomb',
				headers: {
					'Authorization': 'Bearer blorp'
				}
			}, function( err, resp ) {
				result = resp;
				done();
			} );
		} );

		it( 'returns 500', function() {
			result.statusCode.should.equal( 500 );
		});

		it( 'response body has error', function() {
			result.body.should.equal( 'An error occurred while processing this request.' );
		});

		after( cleanup );
	} );

	after( http.stop );
} );