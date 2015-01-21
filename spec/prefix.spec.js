var should = require( 'should' ); // jshint ignore:line
var fs = require( 'fs' );
var requestor = require( 'request' ).defaults( { jar: false } );
var port = 88981;

describe( 'URL & API Prefix', function() {
	var cookieExpiresAt;
	var harness;
	var config;
	// * proxy action that allows an anon user to access an authenticated endpoint
	// * action that returns a file to an authenticated user
	// * action to capture various information from the incoming request and return it to the caller
	// * action to redirect to a different resource
	// * action that throws exception
	// * action with a regex URL
	// * route that throws an exception
	before( function() {
		config = {
			port: port,
			socketio: true,
			websocket: true,
			defaultUser: true,
			anonymous: [ '/api/test/proxy' ],
			parseAhead: true,
			handleRouteErrors: true,
			urlPrefix: '/prefixed',
			apiPrefix: ''
		};
		harness = require( './harness.js' )( config );
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
				regex: { url: /test\/regex.*/, method: 'all', handle: regexUrl }
			}
		} );

		harness.addResource( {
			name: 'testWithStatic',
			static: './spec/public/'
		} );

		harness.setActionRoles( 'test.args', [ 'user' ] );
		harness.addUser( 'usertwo', 'two', 'two', [] );
		harness.start();
	} );

	describe( 'HTTP', function() {
		describe( 'Posting overlapping args (authorized)', function() {
			var response;
			before( function( done ) {
				requestor.post( {
					url: 'http://localhost:88981/prefixed/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' },
					headers: { 'Authorization': 'Bearer one' }
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
					url: 'http://localhost:88981/prefixed/testWithStatic/txt/hello.txt',
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

describe( 'URL Strategy with Prefix', function() {
	var harness;
	var config;
	// * action that returns a file to an authenticated user
	// * action to redirect to a different resource
	before( function() {
		config = {
			port: port,
			socketio: true,
			websocket: true,
			defaultUser: true,
			anonymous: [ '/api/test/proxy' ],
			parseAhead: true,
			handleRouteErrors: true,
			urlPrefix: '/prefixed',
			urlStrategy: function( resourceName, actionName /* action, resources */ ) {
				return [ 'strategized', resourceName, actionName ].join( '/' );
			}
		};
		harness = require( './harness.js' )( config );
		var fileCall = function( env ) {
			env.replyWithFile( 'text/plain', 'hello.txt', fs.createReadStream( './spec/public/txt/hello.txt' ) );
		};

		var redirectCall = function( env ) {
			var data = { id: env.data.id };
			if ( env.data.id === '100' ) {
				env.redirect( '/prefixed/api/strategized/test/thing?id=200' );
			} else if ( env.data.id === '101' ) {
				env.redirect( 301, '/prefixed/api/strategized/test/thing?id=201' );
			} else {
				env.reply( { data: data } );
			}
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
				file: { url: '/file', method: 'get', topic: 'file', handle: fileCall },
				thing: { url: '/thing', method: 'get', topic: 'thing', handle: redirectCall }
			}
		} );

		harness.addResource( {
			name: 'testWithStatic',
			static: './spec/public/'
		} );

		harness.setActionRoles( 'test.args', [ 'user' ] );
		harness.addUser( 'usertwo', 'two', 'two', [] );
		harness.start();
	} );

	describe( 'HTTP', function() {
		describe( 'Requesting file via API', function() {
			var response;
			before( function( done ) {
				requestor.get( {
					url: 'http://localhost:88981/prefixed/api/strategized/test/file',
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
				response.type.should.equal( 'text/plain; charset=utf-8' );
			} );
		} );

		describe( 'Requesting temporarily moved resource', function() {
			var redirect, response;
			before( function( done ) {
				requestor( {
					method: 'get',
					url: 'http://localhost:88981/prefixed/api/strategized/test/thing?id=100',
					headers: { 'Authorization': 'Bearer one' },
					followRedirect: function( r ) {
						redirect = r;
						return true;
					}
				}, function( err, resp ) {
						response = {
							body: JSON.parse( resp.body ),
							status: resp.statusCode
						};
						done();
					} );
			} );

			it( 'should return the redirected item', function() {
				response.body.should.eql( { id: '200' } );
			} );

			it( 'should provied correct redirection', function() {
				redirect.statusCode.should.equal( 302 );
			} );
		} );

		describe( 'Requesting permanently moved resource', function() {
			var redirect, response;
			before( function( done ) {
				requestor.get( {
					url: 'http://localhost:88981/prefixed/api/strategized/test/thing?id=101',
					headers: { 'Authorization': 'Bearer one' },
					followRedirect: function( r ) {
						redirect = r;
						return true;
					}
				}, function( err, resp ) {
						response = {
							body: JSON.parse( resp.body ),
							status: resp.statusCode
						};
						done();
					} );
			} );

			it( 'should return the redirected item', function() {
				response.body.should.eql( { id: '201' } );
			} );

			it( 'should provied correct redirection', function() {
				redirect.statusCode.should.equal( 301 );
			} );
		} );
	} );

	after( function() {
		harness.stop();
	} );
} );
