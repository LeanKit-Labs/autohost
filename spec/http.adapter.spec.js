var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	when = require( 'when' ),
	requestor = require( 'request' ).defaults( { jar: true } ),
	metrics = require( 'cluster-metrics' ),
	port = 88988,
	config = {
		port: port
	},
	authProvider = require( './auth/mock.js' )( config ),
	passport = require( '../src/http/passport.js' )( config, authProvider, metrics ),
	middleware = require( '../src/http/middleware.js' )( config, metrics ),
	http = require( '../src/http/http.js' )( config, requestor, passport, middleware, metrics );
	httpAdapter = require( '../src/http/adapter.js' )( config, authProvider, http, requestor, metrics ),
	actionRoles = function( action, roles ) {
		authProvider.actions[ action ] = { roles: roles };
	},
	userRoles = function( user, roles ) {
		authProvider.users[ user ].roles = roles;
	};

describe( 'with http adapter', function() {
	var cleanup = function() {
			userRoles( 'userman', [] );
			actionRoles( 'test.call', [] );
		};

	before( function() {
		authProvider.tokens = { 'blorp': 'userman' };
		authProvider.users = { 'userman': { name: 'userman', password: 'hi', roles: [] } };
		httpAdapter.action( { name: 'test' }, {
			alias: 'call',
			verb: 'get',
			path: '/call/:one/:two',
			handle: function( env ) {
				envelope = env;
				env.reply( { data: 'ta-da!' } );
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

	after( http.stop );
} );