require( '../setup' );
var requestor = require( 'request' ).defaults( { jar: false } );
var port = 8988;
var config = {
	port: port,
	socketio: true,
	websocket: true,
	defaultUser: true,
	anonymous: [ '/api/test/proxy' ],
	parseAhead: true,
	handleRouteErrors: true
};
var get, post;
var harnessFn = require( '../../src/harness' );

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
		harness = harnessFn( config );
		cookieExpiresAt = new Date( Date.now() + 60000 );
		var argsCall = function( env ) {
			return {
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
			};
		};

		var anonProxy = function( env ) {
			if ( env.transport === 'http' ) {
				var url = 'http://localhost:8988' + env.url.replace( 'proxy', 'args' );
				env.forwardTo( {
					headers: { 'Authorization': 'Bearer one' },
					url: url
				} );
			} else {
				env.reply( { data: 'This call is not supported over websockets' } );
			}
		};

		var errorCall = function( /* env */ ) {
			throw new Error( 'I am bad at things!' );
		};

		var fileCall = function( env ) {
			env.replyWithFile( 'text/plain', 'hello.txt', fs.createReadStream( './spec/public/txt/hello.txt' ) );
		};

		var redirectCall = function( env ) {
			var data = { id: env.data.id };
			if ( env.data.id == '100' ) { // jshint ignore:line
				env.redirect( '/api/test/thing/200' );
			} else if ( env.data.id == '101' ) { // jshint ignore:line
				env.redirect( 301, '/api/test/thing/201' );
			} else {
				env.reply( { data: data } );
			}
		};

		var regexUrl = function( env ) {
			env.reply( { data: 'regex route matched' } );
		};

		var apiPrefixCall = function( env ) {
			env.reply( { data: 'custom apiPrefix route matched' } );
		};

		harness.addMiddleware( '/', function( req, res, next ) {
			req.extendHttp = {
				extension: 'an extension!',
				preparsed: req.preparams
			};
			next();
		}, 'httpExtension' );

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
			name: 'apiPrefixEmpty',
			apiPrefix: '',
			actions: {
				prefix: { url: '/apiPrefix', method: 'get', topic: 'prefix', handle: apiPrefixCall }
			}
		} );

		harness.addResource( {
			name: 'apiPrefixSet',
			apiPrefix: '/custom',
			actions: {
				prefix: { url: '/apiPrefix', method: 'get', topic: 'prefix', handle: apiPrefixCall }
			}
		} );

		harness.addResource( {
			name: 'testWithStatic',
			static: './spec/public/'
		} );

		harness.addResource( {
			name: 'testWithStaticAndMaxAge',
			static: {
				path: './spec/public/',
				maxAge: '1d',
				setHeaders: function( res ) {
					res.set( 'test-header', 'custom' );
				}
			}
		} );

		function returnContext( envelope ) {
			return { data: envelope.context };
		}

		harness.addResource( {
			name: 'middlewareResource',
			middleware: function( envelope, next ) {
				if( envelope.headers.wtf ) {
					return {
						status: 700,
						headers: {
							'content-type': 'application/json'
						},
						data: [ 'whisky', 'tango', 'foxtrot' ]
					};
				} else {
					return next();
				}
			},
			actions: {
				plain: {
					handle: returnContext
				},
				extra: {
					middleware: [
						function( envelope, next ) {
							if( envelope.headers[ 'action-middleware' ] === '1' ) {
								envelope.context.mw = 1;
							}
							return next();
						},
						function( envelope, next ) {
							if( envelope.data.mw ) {
								envelope.context.mw2 = envelope.data.test;
							}
							return next();
						}
					],
					method: 'get',
					url: '/extra/:test',
					handle: returnContext
				},
				bad: {
					middleware: [
						function( envelope, next ) {
							return next();
						},
						undefined
					],
					method: 'get',
					url: '/bad',
					handle: returnContext
				}
			}
		} );

		harness.addResource( {
			name: 'actionAuth',
			actions: {
				canhaz: {
					authorize: function( envelope ) {
						return envelope.headers.canhaz;
					},
					handle: function() {
						return { data: 'Yes, you can' };
					}
				},
				cantneverhaz: {
					url: '/busted',
					authorize: function() {
						throw new Error( 'This is why you can\'t have nice things ...' );
					},
					handle: function() {
						return { data: 'Don\'t you wish your API wasn\'t busted like me?' };
					}
				}
			}
		} );

		harness.addRoute( '/api/test/fail', 'GET', errorCall );
		harness.addTopic( 'fail', errorCall );
		harness.setActionRoles( 'test.args', [ 'user' ] );
		harness.setActionRoles( 'actionAuth.canhaz', [ 'user' ] );
		harness.addUser( 'usertwo', 'two', 'two', [] );
		harness.addUser( 'usererror', 'three', 'three', [] );
		harness.addUser( 'usernoperm', 'four', 'four', [] );
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

	describe( 'Resource and action middleware', function() {
		it( 'should short-circuit stack when resource middleware is activated', function() {
			return get(
				{
					url: 'http://localhost:8988/api/middlewareResource',
					headers: { 'Authorization': 'Bearer one', 'wtf': 'true' }
				} )
				.then( transformResponse( 'body', 'type', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: '["whisky","tango","foxtrot"]',
					statusCode: 700,
					type: 'application/json; charset=utf-8'
				} );
		} );

		it( 'should activate first action middelware independently', function() {
			return get(
				{
					url: 'http://localhost:8988/api/middlewareResource/extra/test',
					headers: { 'Authorization': 'Bearer one', 'action-middleware': '1' }
				} )
				.then( transformResponse( 'body', 'type', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: '{"mw":1}',
					statusCode: 200,
					type: 'application/json; charset=utf-8'
				} );
		} );

		it( 'should activate second action middelware independently', function() {
			return get(
				{
					url: 'http://localhost:8988/api/middlewareResource/extra/test?mw=true',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'type', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: '{"mw2":"test"}',
					statusCode: 200,
					type: 'application/json; charset=utf-8'
				} );
		} );

		it( 'should activate first and second action middelware', function() {
			return get(
				{
					url: 'http://localhost:8988/api/middlewareResource/extra/test?mw=true',
					headers: { 'Authorization': 'Bearer one', 'action-middleware': '1' }
				} )
				.then( transformResponse( 'body', 'type', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: '{"mw":1,"mw2":"test"}',
					statusCode: 200,
					type: 'application/json; charset=utf-8'
				} );
		} );

		it( 'should return a server error when undefined middleware is supplied', function() {
			return get(
				{
					url: 'http://localhost:8988/api/middlewareResource/bad',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'type', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: '{"message":"The server failed to provide a response"}',
					statusCode: 500,
					type: 'application/json; charset=utf-8'
				} );
		} );
	} );

	describe( 'Calling action with action authorization (unauthorized)', function() {
		it( 'should reject user as not having adequate permissions', function() {
			return get(
				{
					url: 'http://localhost:8988/api/actionAuth',
					headers: { 'Authorization': 'Bearer two' }
				} )
				.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
				.should.eventually.have.property( 'body' ).that.equal( 'User lacks sufficient permissions' );
		} );
	} );

	describe( 'Calling action with action authorization (override)', function() {
		it( 'should reject user as not having adequate permissions', function() {
			return get(
				{
					url: 'http://localhost:8988/api/actionAuth',
					headers: {
						'Authorization': 'Bearer two',
						canhaz: true
					}
				} )
				.then( transformResponse( 'body' ) )
				.should.eventually.have.property( 'body' ).that.equal( 'Yes, you can' );
		} );
	} );

	describe( 'Calling action with action authorization (broken)', function() {
		it( 'should reject user as not having adequate permissions', function() {
			return get(
				{
					url: 'http://localhost:8988/api/actionAuth/busted',
					headers: {
						'Authorization': 'Bearer two',
						canhaz: true
					}
				} )
				.then( transformResponse( 'body', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: 'Server error at ALL /api/actionAuth/busted',
					statusCode: 500
				} );
		} );
	} );

	describe( 'Posting overlapping args (authorized)', function() {
		it( 'should preserve overlapping values', function() {
			return post(
				{
					url: 'http://localhost:8988/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' },
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
				.should.eventually.deep.equal(
				{
					body: [
						'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'an extension!',
						{ one: 'alpha', two: 'bravo', three: 'charlie' }
					],
					header: 'look a header value!',
					cookie: 'an-cookies=chocolate%20chip; Domain=autohost.com; Path=/api; Expires=' + cookieExpiresAt.toUTCString()
				} );
		} );
	} );

	describe( 'Posting overlapping args (unauthenticated)', function() {
		it( 'should reject user as unauthorized', function() {
			return post(
				{
					url: 'http://localhost:8988/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' }
				} )
				.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
				.should.eventually.have.property( 'body' ).that.equal( 'Unauthorized' );
		} );
	} );

	describe( 'Posting overlapping args (unauthorized)', function() {
		it( 'should reject user as not having adequate permissions', function() {
			return post(
				{
					url: 'http://localhost:8988/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' },
					headers: { 'Authorization': 'Bearer two' }
				} )
				.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
				.should.eventually.have.property( 'body' ).that.equal( 'User lacks sufficient permissions' );
		} );
	} );

	describe( 'Posting overlapping args (exception on role check)', function() {
		it( 'should reject user as not having adequate permissions', function() {
			return post(
				{
					url: 'http://localhost:8988/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' },
					headers: { 'Authorization': 'Bearer three' }
				} )
				.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
				.should.eventually.have.property( 'body' ).that.equal( 'Could not determine user permission' );
		} );
	} );

	describe( 'Posting overlapping args (exception on checkPermissions)', function() {
		it( 'should reject user as not having adequate permissions', function() {
			return post(
				{
					url: 'http://localhost:8988/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' },
					headers: { 'Authorization': 'Bearer four' }
				} )
				.should.eventually.have.deep.property( '[0].body' ).to.equal( 'User lacks sufficient permissions' );
		} );
	} );

	describe( 'Proxy - Posting overlapping args (unauthenticated)', function() {
		it( 'should preserve overlapping values', function() {
			return post(
				{
					url: 'http://localhost:8988/api/test/proxy/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' }
				} )
				.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
				.should.eventually.deep.equal(
				{
					body: [
						'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'an extension!',
						{ one: 'alpha', two: 'bravo', three: 'charlie' }
					],
					header: 'look a header value!',
					cookie: 'an-cookies=chocolate%20chip; Domain=autohost.com; Path=/api; Expires=' + cookieExpiresAt.toUTCString()
				} );
		} );
	} );

	describe( 'Proxy - Posting overlapping args (unauthorized)', function() {
		it( 'should preserve overlapping values', function() {
			return post(
				{
					url: 'http://localhost:8988/api/test/proxy/alpha/bravo/charlie?three=echo&four=foxtrot',
					json: true,
					body: { four: 'delta' },
					headers: {
						'Authorization': 'Bearer two'
					}
				} )
				.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
				.should.eventually.deep.equal(
				{
					body: [
						'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'an extension!',
						{ one: 'alpha', two: 'bravo', three: 'charlie' }
					],
					header: 'look a header value!',
					cookie: 'an-cookies=chocolate%20chip; Domain=autohost.com; Path=/api; Expires=' + cookieExpiresAt.toUTCString()
				} );
		} );
	} );

	describe( 'Requesting file via API', function() {
		it( 'should return the file', function() {
			return get(
				{
					url: 'http://localhost:8988/api/test/file',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'type' ), onError )
				.should.eventually.deep.equal(
				{
					body: 'hello, world!',
					type: 'text/plain; charset=utf-8'
				} );
		} );
	} );

	describe( 'Requesting temporarily moved resource', function() {
		it( 'should redirect correctly', function() {
			var redirect;
			return get(
				{
					url: 'http://localhost:8988/api/test/thing/100',
					headers: { 'Authorization': 'Bearer one' },
					followRedirect: function( r ) {
						redirect = r;
						return true;
					}
				} )
				.then( transformResponse( 'body', 'statusCode' ), onError )
				.then( function( res ) {
					res.originalCode = redirect.statusCode;
					res.body = JSON.parse( res.body );
					return res;
				} )
				.should.eventually.deep.equal(
				{
					body: { id: '200' },
					statusCode: 200,
					originalCode: 302
				} );
		} );
	} );

	describe( 'Requesting permanently moved resource', function() {
		it( 'should redirect correctly', function() {
			var redirect;
			return get(
				{
					url: 'http://localhost:8988/api/test/thing/101',
					headers: { 'Authorization': 'Bearer one' },
					followRedirect: function( r ) {
						redirect = r;
						return true;
					}
				} )
				.then( transformResponse( 'body', 'statusCode' ), onError )
				.then( function( res ) {
					res.originalCode = redirect.statusCode;
					res.body = JSON.parse( res.body );
					return res;
				} )
				.should.eventually.deep.equal(
				{
					body: { id: '201' },
					statusCode: 200,
					originalCode: 301
				} );
		} );
	} );

	describe( 'Requests to regular expression action', function() {
		var requests = [
			{
				url: 'http://localhost:8988/api/test/regex/a/b/c/d/e/f/g/h/i',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:8988/api/test/regexIsSoCool',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:8988/api/test/regex?is=fun',
				headers: { 'Authorization': 'Bearer one' }
			},
			{
				url: 'http://localhost:8988/api/test/oops/regex',
				headers: { 'Authorization': 'Bearer one' }
			}
		];

		var getFn = function( req ) {
			return function() {
				return get( req );
			};
		};

		it( 'should complete calls for all routes', function() {
			return seq( _.map( requests, getFn ) )
				.then( function( responses ) {
					return _.map( responses, 'statusCode' );
				} )
				.should.eventually.deep.equal( [ 200, 200, 200, 404 ] );
		} );
	} );

	describe( 'Requesting a resource with a custom apiPrefix', function() {
		it( 'should match the request with an empty apiPrefix', function() {
			return get(
				{
					url: 'http://localhost:8988/apiPrefixEmpty/apiPrefix',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: 'custom apiPrefix route matched',
					statusCode: 200
				}
			);
		} );

		it( 'should match the request with a custom apiPrefix', function() {
			return get(
				{
					url: 'http://localhost:8988/custom/apiPrefixSet/apiPrefix',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: 'custom apiPrefix route matched',
					statusCode: 200
				}
			);
		} );
	} );

	describe( 'Making a request to a broken action', function() {
		it( 'should return a 500 and error message', function() {
			return get(
				{
					url: 'http://localhost:8988/api/test/error',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: 'I am bad at things!',
					statusCode: 500
				}
			);
		} );
	} );

	describe( 'Making a request to a broken route', function() {
		it( 'should return a 500 and error message', function() {
			return get(
				{
					url: 'http://localhost:8988/api/test/fail',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'statusCode' ), onError )
				.should.eventually.deep.equal(
				{
					body: 'Server error at GET /api/test/fail',
					statusCode: 500
				}
			);
		} );
	} );

	describe( 'Accessing static files from a resource static path (string)', function() {
		it( 'should return the file and correct mimetype', function() {
			return get(
				{
					url: 'http://localhost:8988/testWithStatic/txt/hello.txt',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'type' ), onError )
				.should.eventually.deep.equal(
				{
					body: 'hello, world!',
					type: 'text/plain; charset=UTF-8'
				}
			);
		} );
	} );

	describe( 'Accessing static files from a resource static path (hash)', function() {
		it( 'should return the file correct cache settings and custom header', function() {
			return get(
				{
					url: 'http://localhost:8988/testWithStaticAndMaxAge/txt/hello.txt',
					headers: { 'Authorization': 'Bearer one' }
				} )
				.then( transformResponse( 'body', 'type', 'cache', 'testHeader' ), onError )
				.should.eventually.deep.equal(
				{
					body: 'hello, world!',
					type: 'text/plain; charset=UTF-8',
					cache: 'public, max-age=86400',
					header: 'custom'
				}
			);
		} );
	} );

	describe( 'Without users', function() {

		before( function() {
			harness.clearUsers();
		} );

		describe( 'Accessing static files from a resource static path', function() {
			it( 'should return the file and correct mimetype', function() {
				return get(
					{
						url: 'http://localhost:8988/testWithStatic/txt/hello.txt'
					} )
					.then( transformResponse( 'body', 'type' ), onError )
					.should.eventually.deep.equal(
					{
						body: 'hello, world!',
						type: 'text/plain; charset=UTF-8'
					}
				);
			} );
		} );
	} );

	after( function() {
		harness.stop();
	} );
} );
