require( '../setup' );
var requestor = require( 'request' ).defaults( { jar: false } );
var port = 8988;
var path = require( 'path' );
var config = {
	port: port,
	socketio: false,
	websocket: false,
	defaultUser: true,
};
var get;

describe( 'Configuration', function() {
	var harness, cwd;

	before( function() {
		cwd = process.cwd();
		process.chdir( path.join( __dirname, '..' ) );
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
	} );

	describe( 'static option', function() {
		describe( 'static: false', function() {
			before( function() {
				var testConfig = _.extend( {}, config, {
					static: false
				} );
				harness = require( './harness.js' )( testConfig );
				harness.start();
			} );

			it( 'should not set up a default public route', function() {
				return get(
					{
						url: 'http://localhost:8988/txt/hello.txt',
						headers: {
							'Authorization': 'Bearer one'
						}
					} )
					.then( transformResponse( 'body', 'statusCode' ), onError )
					.should.eventually.deep.equal(
					{
						body: 'Cannot GET /txt/hello.txt\n',
						statusCode: 404
					}
				);
			} );

			after( function() {
				harness.stop();
			} );
		} );
		describe( 'static: undefined', function() {
			var cwd;

			before( function() {
				cwd = process.cwd();
				harness = require( './harness.js' )( _.extend( {}, config ) );
				harness.start();
			} );

			it( 'should set up default static path, pointing to "public" folder', function() {
				return get(
					{
						url: 'http://localhost:8988/txt/hello.txt',
						headers: {
							'Authorization': 'Bearer one'
						}
					} )
					.then( transformResponse( 'body', 'statusCode' ), onError )
					.should.eventually.deep.equal(
					{
						body: 'hello, world!',
						statusCode: 200
					}
				);
			} );

			after( function() {
				harness.stop();
			} );
		} );
		describe( 'static: string', function() {
			before( function() {
				var testConfig = _.extend( {}, config, {
					static: './public/txt'
				} );
				harness = require( './harness.js' )( testConfig );
				harness.start();
			} );

			it( 'should set up the static path pointing to the "txt" folder', function() {
				return get(
					{
						url: 'http://localhost:8988/hello.txt',
						headers: {
							'Authorization': 'Bearer one'
						}
					} )
					.then( transformResponse( 'body', 'statusCode' ), onError )
					.should.eventually.deep.equal(
					{
						body: 'hello, world!',
						statusCode: 200
					}
				);
			} );

			after( function() {
				harness.stop();
			} );
		} );
		describe( 'static: hash', function() {
			before( function() {
				var testConfig = _.extend( {}, config, {
					static: {
						path: './public/',
						maxAge: '1d',
						setHeaders: function( res ) {
							res.set( 'test-header', 'custom' );
						}
					}
				} );
				harness = require( './harness.js' )( testConfig );
				harness.start();
			} );

			it( 'should set up the static path with the correct cache settings and headers', function() {
				return get(
					{
						url: 'http://localhost:8988/txt/hello.txt',
						headers: {
							'Authorization': 'Bearer one'
						}
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

			after( function() {
				harness.stop();
			} );
		} );
	} );

	after( function() {
		process.chdir( cwd );
	} );
} );
