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
	handleRouteErrors: true
};

describe( 'HTTP', function() {
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

		var anonProxy = function( env ) {
			if ( env.transport === 'http' ) {
				var url = 'http://localhost:88981' + env.url.replace( 'proxy', 'args' );
				env.forwardTo( {
					headers: { 'Authorization': 'Bearer one' },
					url: url
				} );
			} else {
				env.reply( { data: 'This call is not supported over websockets' } );
			}
		};

		var errorCall = function( env ) {
			throw new Error( 'I am bad at things!' );
		};

		var fileCall = function( env ) {
			env.replyWithFile( 'text/plain', 'hello.txt', fs.createReadStream( './spec/public/txt/hello.txt' ) );
		};

		var redirectCall = function( env ) {
			var data = { id: env.data.id };
			if ( env.data.id == '100' ) {
				env.redirect( '/api/test/thing/200' );
			} else if ( env.data.id == '101' ) {
				env.redirect( 301, '/api/test/thing/201' );
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
				proxy: { url: '/proxy/:one/:two/:three', method: 'post', topic: 'proxy', handle: anonProxy },
				regex: { url: /test\/regex.*/, method: 'all', handle: regexUrl },
				thing: { url: '/thing/:id', method: 'get', topic: 'thing', handle: redirectCall }
			}
		} );

		harness.addResource( {
			name: 'testWithStatic',
			static: './spec/public/'
		} );

		harness.addRoute( '/api/test/fail', 'GET', errorCall );
		harness.addTopic( 'fail', errorCall );
		harness.setActionRoles( 'test.args', [ 'user' ] );
		harness.addUser( 'usertwo', 'two', 'two', [] );
		harness.addUser( 'usererror', 'three', 'three', [] );
		harness.addUser( 'usernoperm', 'four', 'four', [] );
		harness.start();
	} );

	describe( 'Posting overlapping args (authorized)', function() {
		var response;
		before( function( done ) {
			requestor.post( {
				url: 'http://localhost:88981/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
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

	describe( 'Posting overlapping args (unauthenticated)', function() {
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

		it( 'should reject user as unauthorized', function() {
			response.body.should.eql( 'Unauthorized' );
		} );
	} );

	describe( 'Posting overlapping args (unauthorized)', function() {
		var response;
		before( function( done ) {
			requestor.post( {
				url: 'http://localhost:88981/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
				json: true,
				body: { four: 'delta' },
				headers: { 'Authorization': 'Bearer two' }
			}, function( err, resp ) {
					response = {
						body: resp.body,
						header: resp.headers[ 'test-header' ],
						cookie: resp.headers[ 'set-cookie' ][ 0 ]
					};
					done();
				} );
		} );

		it( 'should reject user as not having adequate permissions', function() {
			response.body.should.eql( 'User lacks sufficient permissions' );
		} );
	} );

	describe( 'Posting overlapping args (exception on role check)', function() {
		var response;
		before( function( done ) {
			requestor.post( {
				url: 'http://localhost:88981/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
				json: true,
				body: { four: 'delta' },
				headers: { 'Authorization': 'Bearer three' }
			}, function( err, resp ) {
					response = {
						body: resp.body,
						status: resp.statusCode,
						header: resp.headers[ 'test-header' ],
						cookie: resp.headers[ 'set-cookie' ][ 0 ]
					};
					done();
				} );
		} );

		it( 'should reject user as not having adequate permissions', function() {
			response.body.should.eql( 'Could not determine user permissions' );
		} );
	} );

	describe( 'Posting overlapping args (exception on checkPermissions)', function() {
		var response;
		before( function( done ) {
			requestor.post( {
				url: 'http://localhost:88981/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
				json: true,
				body: { four: 'delta' },
				headers: { 'Authorization': 'Bearer four' }
			}, function( err, resp ) {
					response = {
						body: resp.body,
						header: resp.headers[ 'test-header' ],
						cookie: resp.headers[ 'set-cookie' ][ 0 ]
					};
					done();
				} );
		} );

		it( 'should reject user as not having adequate permissions', function() {
			response.body.should.eql( 'User lacks sufficient permissions' );
		} );
	} );

	describe( 'Proxy - Posting overlapping args (unauthenticated)', function() {
		var response;
		before( function( done ) {
			requestor.post( {
				url: 'http://localhost:88981/api/test/proxy/alpha/bravo/charlie?three=echo&four=foxtrot',
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

	describe( 'Proxy - Posting overlapping args (unauthorized)', function() {
		var response;
		before( function( done ) {
			requestor.post( {
				url: 'http://localhost:88981/api/test/proxy/alpha/bravo/charlie?three=echo&four=foxtrot',
				json: true,
				body: { four: 'delta' },
				headers: {
					'Authorization': 'Bearer two'
				}
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

	describe( 'Requesting file via API', function() {
		var response;
		before( function( done ) {
			requestor.get( {
				url: 'http://localhost:88981/api/test/file',
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
				url: 'http://localhost:88981/api/test/thing/100',
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
				url: 'http://localhost:88981/api/test/thing/101',
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

	describe( 'Requests to regular expression action', function() {
		var codes;
		var requests = [
			{
				url: 'http://localhost:88981/api/test/regex/a/b/c/d/e/f/g/h/i',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:88981/api/test/regexIsSoCool',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:88981/api/test/regex?is=fun',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:88981/api/test/oops/regex',
				headers: { 'Authorization': 'Bearer one' }
			}
		];
		var get = function( req ) {
			return function() {
				return when.promise( function( resolve ) {
					requestor.get( req, function( err, resp ) {
						resolve( err || resp );
					} );
				} );
			};
		};

		before( function( done ) {
			seq( _.map( requests, get ) )
				.then( function( responses ) {
					codes = _.map( responses, 'statusCode' );
					done();
				} );
		} );

		it( 'should have resulted in completed calls for matching routes', function() {
			codes.should.eql( [ 200, 200, 200, 404 ] );
		} );
	} );

	describe( 'Making a request to a broken action', function() {
		var response;
		before( function( done ) {
			requestor.get( {
				url: 'http://localhost:88981/api/test/error',
				headers: { 'Authorization': 'Bearer one' }
			}, function( err, resp ) {
					response = {
						body: resp.body,
						status: resp.statusCode
					};
					done();
				} );
		} );

		it( 'should return the redirected item', function() {
			response.body.should.eql( 'Server error at GET /error' );
		} );

		it( 'should provied correct redirection', function() {
			response.status.should.equal( 500 );
		} );
	} );

	describe( 'Making a request to a broken route', function() {
		var response;
		before( function( done ) {
			requestor.get( {
				url: 'http://localhost:88981/api/test/fail',
				headers: { 'Authorization': 'Bearer one' }
			}, function( err, resp ) {
					response = {
						body: resp.body,
						status: resp.statusCode
					};
					done();
				} );
		} );

		it( 'should return the redirected item', function() {
			response.body.should.eql( 'Server error at GET /api/test/fail' );
		} );

		it( 'should provied correct redirection', function() {
			response.status.should.equal( 500 );
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

	describe( 'Without users', function() {

		before( function() {
			harness.clearUsers();
		} );

		describe( 'Accessing static files from a resource static path', function() {
			var response;
			before( function( done ) {
				requestor.get( {
					url: 'http://localhost:88981/testWithStatic/txt/hello.txt'
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
