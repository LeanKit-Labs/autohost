var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	when = require( 'when' ),
	seq = require( 'when/sequence' ),
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

describe( 'with http module', function() {
	var middlewareHit = [],
		request,
		statusCode = 200,
		response,
		cleanup = function() {
			middlewareHit = [];
			request = undefined;
			response = undefined;
			statusCode = 200;
		};

	before( function() {
		authProvider.users = {};
		passport.resetUserCheck();

		http.middleware( '/', function( req, res, next ) {
			middlewareHit.push( 1 );
			next();
		} );
		http.middleware( '/', function( req, res, next ) {
			middlewareHit.push( 2 );
			next();
		} );
		http.middleware( '/', function( req, res, next ) {
			middlewareHit.push( 3 );
			next();
		} );
		http.static( '/files', path.join( __dirname, './public' ) );
		http.route( '/thing/:one/:two', 'all', function( req, res ) {
			request = req;
			res.status( statusCode ).send( response );
		} );
		http.start();
	} );

	describe( 'when getting a static file', function() {
		var result;

		before( function( done ) {
			requestor.get( {
				url: 'http://localhost:88988/files/txt/hello.txt' 
			}, function( err, resp ) {
				result = resp.body;
				done();
			} );
		} );

		it( 'should return file contents', function() {
			result.should.equal( 'hello, world!' );
		} );

		it( 'should execute all middleware in order', function() {
			middlewareHit.should.eql( [ 1, 2, 3 ] );
		} );

		after( cleanup );
	} );

	describe( 'when requesting a missing static file', function() {
		var result;

		before( function( done ) {
			requestor.get( {
				url: 'http://localhost:88988/files/txt/missing.txt'
			}, function( err, resp ) {
				result = resp.body;
				done();
			} );
		} );

		it( 'should report files as unavailable', function() {
			result.should.equal( 'Cannot GET /files/txt/missing.txt\n' );
		} );

		it( 'should execute all middleware in order', function() {
			middlewareHit.should.eql( [ 1, 2, 3 ] );
		} );

		after( cleanup );
	} );

	describe( 'when calling get on route', function() {
		var result;

		before( function( done ) {
			response = 'hey, a thing';
			requestor.get( {
				url: 'http://localhost:88988/thing/a/b?c=3' 
			}, function( err, resp ) {
				result = resp;
				done();
			} );
		} );

		it( 'should return file contents', function() {
			result.body.should.equal( 'hey, a thing' );
		} );

		it( 'should have parameters available', function() {
			request.params.one.should.equal( 'a' );
			request.params.two.should.equal( 'b' );
			request.query.c.should.equal( '3' );
		} );

		it( 'should execute all middleware in order', function() {
			middlewareHit.should.eql( [ 1, 2, 3 ] );
		} );

		after( cleanup );
	} );

	describe( 'when authenticating with session support', function() {
		var originalAuthenticate = authProvider.authenticate,
			counter = 0,
			codes,
			get = function() { 
				return when.promise( function( resolve ) {
					requestor.get( {
						url: 'http://localhost:88988/thing/a/b?c=3',
						headers: { 'Authorization': 'Basic dGVzdDp0ZXN0' }
					}, function( err, resp ) {
						resolve( err || resp );
					} ); 
				} );
			};

		before( function( done ) {
			authProvider.authenticate = function( req, res, next ) {
				counter = counter + 1;				
				originalAuthenticate( req, res, next );
			};
			authProvider.users = { test: { name: 'test', password: 'test' } };
			seq( [ get, get, get ] )
				.then( function( responses ) {
					codes =_.map( responses, 'statusCode' );
					done();
				} );
		} );

		it( 'should have completed all requests successfully', function() {
			codes.should.eql( [ 200, 200, 200 ] );
		} );

		it( 'should only authenticate credentials once', function() {
			counter.should.be.lessThan( 2 );
		} );

		after( function() {
			authProvider.authenticate = originalAuthenticate;
			authProvider.users = {};
		} );
	} );

	after( http.stop );
} );