require( '../setup' );
var requestor = require( 'request' ).defaults( { jar: false } );
var port = 8988;
var post, get;
var harnessFn = require( '../../src/harness' );
before( function() {
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
		harness = harnessFn( config );
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
			it( 'should preserve overlapping values', function() {
				return post(
					{
						url: 'http://localhost:8988/prefixed/test/args/alpha/bravo/charlie?three=echo&four=foxtrot',
						json: true,
						body: { four: 'delta' },
						headers: { 'Authorization': 'Bearer one' }
					} )
					.then( transformResponse( 'body', 'testHeader', 'setCookie' ), onError )
					.should.eventually.deep.equal(
					{
						body: [
							'alpha', 'bravo', 'charlie', 'delta', 'charlie', 'foxtrot', 'an extension!',
							{ one: 'alpha', two: 'bravo', three: 'charlie' }
						],
						header: 'look a header value!',
						cookie: 'an-cookies=chocolate%20chip; Domain=autohost.com; Path=/api; Expires=' + cookieExpiresAt.toUTCString()
					} );
			} );
		} );

		describe( 'Accessing static files from a resource static path', function() {
			it( 'should return the file and correct mimetype', function() {
				return get(
					{
						url: 'http://localhost:8988/prefixed/testWithStatic/txt/hello.txt',
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
		harness = harnessFn( config );
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
			it( 'should return the file and correct mimetype', function() {
				return get(
					{
						url: 'http://localhost:8988/prefixed/api/strategized/test/file',
						headers: { 'Authorization': 'Bearer one' }
					} )
					.then( transformResponse( 'body', 'type' ), onError )
					.should.eventually.deep.equal(
					{
						body: 'hello, world!',
						type: 'text/plain; charset=utf-8'
					}
				);
			} );
		} );

		describe( 'Requesting temporarily moved resource', function() {
			it( 'should redirect correctly', function() {
				var redirect;
				return get(
					{
						url: 'http://localhost:8988/prefixed/api/strategized/test/thing?id=100',
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
						url: 'http://localhost:8988/prefixed/api/strategized/test/thing?id=101',
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
	} );

	after( function() {
		harness.stop();
	} );
} );
