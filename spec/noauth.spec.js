var should = require( 'should' ); //jshint ignore:line
var _ = require( 'lodash' );
var when = require( 'when' );
var seq = require( 'when/sequence' );
var fs = require( 'fs' );
var requestor = require( 'request' ).defaults( { jar: false } );
var postal = require( 'postal' );
var events = postal.channel( 'events' );
var port = 88981;
var config = {
	port: port,
	socketio: true,
	websocket: true,
	defaultUser: true,
	anonymous: [ '/api/test/proxy' ],
	parseAhead: true,
	handleRouteErrors: true,
	noAuth: true
};

describe( 'No Authentication', function() {
	var cookieExpiresAt;
	var harness;
	// * proxy action that allows an anon user to access an authenticated endpoint
	// * action that returns a file to an authenticated user
	// * action to capture various information from the incoming request and return it to the caller
	// * action to redirect to a different resource
	// * action that throws exception
	// * action with a regex URL
	// * route that throws an exception
	before( function() {
		harness = require( './harness.js' )( config );
		harness.httpAdapter.passport.resetUserCheck();
		cookieExpiresAt = new Date( Date.now() + 60000 );
		var argsCall = function( env ) {
			env.reply( {
				data: [ env.data.one, env.data.two, env.data.three, env.data.four, env.params.three, env.params.four, env.extension, env.preparsed ],
				headers: { 'test-header': 'look a header value!' },
				cookies: { 'an-cookies': {
						value: 'chocolate chip',
						options: {
							expires: cookieExpiresAt,
							path: '/api',
							domain: 'autohost.com'
						}
					} }
			} );
		};

		var errorCall = function( env ) {
			throw new Error( 'I am bad at things!' );
		};

		var fileCall = function( env ) {
			env.replyWithFile( 'text/plain', 'hello.txt', fs.createReadStream( './spec/public/txt/hello.txt' ) );
		};

		var redirectCall = function( env ) {
			var data = { id: env.data.id };
			if ( env.data.id === '100' ) {
				env.redirect( '/test/thing/200' );
			} else if ( env.data.id === '101' ) {
				env.redirect( 301, '/test/thing/201' );
			} else {
				env.reply( { data: data } );
			}
		};

		var regexUrl = function( env ) {
			env.reply( { data: 'regex route matched' } );
		};

		harness.addMiddleware( '/', function( req, res, next ) {
			req.extendHttp = {
				extension: 'an extension!',
				preparsed: req.preparams
			};
			next();
		} );

		harness.addResource( {
			name: 'test',
			actions: {
				args: { url: '/args/:one/:two/:three', method: 'post', topic: 'args', handle: argsCall },
				error: { url: '/error', method: 'get', topic: 'error', handle: errorCall },
				file: { url: '/file', method: 'get', topic: 'file', handle: fileCall },
				regex: { url: /test\/regex.*/, method: 'all', handle: regexUrl },
				thing: { url: '/thing/:id', method: 'get', topic: 'thing', handle: redirectCall }
			}
		} );

		harness.addResource( {
			name: 'testWithStatic',
			static: './spec/public/'
		} );

		harness.addRoute( '/test/fail', 'GET', errorCall );
		harness.start();
	} );

	describe( 'HTTP', function() {
		describe( 'Posting overlapping args', function() {
			var response;
			before( function( done ) {
				requestor.post( {
					url: 'http://localhost:88981/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' }
				}, function( err, resp ) {
						response = {
							body: resp.body,
							header: resp.headers[ 'test-header' ],
							cookie: resp.headers[ 'set-cookie' ][ 0 ]
						};
						done();
					} );
			} );

			it( 'should preserve overlapping values', function() {
				response.body.should.eql( [ 'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'an extension!', { one: 'alpha', two: 'bravo', three: 'charlie' } ] );
			} );

			it( 'should include custom header', function() {
				response.header.should.equal( 'look a header value!' );
			} );

			it( 'should include custom cookie', function() {
				response.cookie.should.equal( 'an-cookies=chocolate%20chip; Domain=autohost.com; Path=/api; Expires=' + cookieExpiresAt.toUTCString() );
			} );
		} );

		describe( 'Accessing static files from a resource static path', function() {
			var response;
			before( function( done ) {
				requestor.get( {
					url: 'http://localhost:88981/testWithStatic/txt/hello.txt',
					headers: { 'Authorization': 'Bearer one' }
				}, function( err, resp ) {
						response = {
							body: resp.body,
							type: resp.headers[ 'content-type' ]
						};
						done();
					} );
			} );

			it( 'should return the file', function() {
				response.body.should.eql( 'hello, world!' );
			} );

			it( 'should return the correct mimetype', function() {
				response.type.should.equal( 'text/plain; charset=UTF-8' );
			} );
		} );
	} );

	after( function() {
		harness.stop();
	} );
} );
