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
	handleRouteErrors: true,
	noAuth: true
};
var get, post;
var harnessFn = require( '../../src/harness' );

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
		harness = harnessFn( config );
		if ( harness.httpAdapter.passport ) {
			harness.httpAdapter.passport.resetUserCheck();
		}
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

		var errorCall = function( /* env */ ) {
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

		harness.addMiddleware( '/', function httpExtension( req, res, next ) {
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

		harness.addRoute( '/test/fail', 'GET', errorCall );
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

	describe( 'HTTP', function() {
		describe( 'Posting overlapping args', function() {
			it( 'should preserve overlapping values', function() {
				return post(
					{
						url: 'http://localhost:8988/api/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
						json: true,
						body: { four: 'delta' }
					} )
					.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
					.should.eventually.deep.equal(
					{
						body: [
							'alpha', 'bravo', 'charlie', 'foxtrot', 'charlie', 'foxtrot', 'an extension!',
							{ one: 'alpha', two: 'bravo', three: 'charlie' }
						],
						header: 'look a header value!',
						cookie: 'an-cookies=chocolate%20chip; Domain=autohost.com; Path=/api; Expires=' + cookieExpiresAt.toUTCString()
					} );
			} );
		} );

		describe( 'Accessing static files from a resource static path (string)', function() {
			it( 'should return the file correct mimetype', function() {
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

		describe( 'Accessing static files from a resource static path (hash)', function() {
			it( 'should return the file correct cache settings and custom header', function() {
				return get(
					{
						url: 'http://localhost:8988/testWithStaticAndMaxAge/txt/hello.txt'
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
	} );

	after( function() {
		harness.stop();
	} );
} );
