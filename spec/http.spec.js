var should = require( 'should' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	requestor = require( 'request' ).defaults( { jar: false } ),
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
		http.start( authProvider );
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

	after( http.stop );
} );