require( '../setup' );
var Envelope = require( '../../src/websocket/socketEnvelope.js' );
var util = require( 'util' );

describe( 'Socket Envelope', function() {

	describe( 'when handling return', function() {
		var topic = 'test.topic';

		describe( 'with host defined custom error', function() {
			var host, envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket);
				host = {
					errors: {
						'MyCustom': {
							reply: function( error ) {
								return util.format( '%s: %s', error.name, error.message );
							}
						}
					}
				};
				envelope.handleReturn( host, {}, {}, new MyCustomError( 'test' ) );
			} );

			it( 'should create message data from reply method', function() {
				socket.published.should.eql( [
					{
						success: false,
						status: 500,
						data: 'MyCustom: test'
					}
				] );
			} );
		} );

		describe( 'with resource defined custom error', function() {
			var resource, envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket );
				resource = {
					errors: {
						'MyCustom': {
							status: 404,
							body: 'NEVER EVER'
						}
					}
				};
				envelope.handleReturn( {}, resource, {}, new MyCustomError( 'test' ) );
			} );

			it( 'should create message data from reply body', function() {
				socket.published.should.eql( [
					{
						success: false,
						status: 404,
						data: 'NEVER EVER'
					}
				] );
			} );
		} );

		describe( 'with action defined custom error', function() {
			var action, envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket );
				action = {
					errors: {
						'MyCustom': {
							status: 401
						}
					}
				};
				envelope.handleReturn( {}, {}, action, new MyCustomError( 'a test' ) );
			} );

			it( 'should use error message as message data', function() {
				socket.published.should.eql( [
					{
						success: false,
						status: 401,
						data: 'a test'
					}
				] );
			} );
		} );

		describe( 'with undefined custom error', function() {
			var envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket );
				envelope.handleReturn( {}, {}, {}, new MyCustomError( 'no support' ) );
			} );

			it( 'should default error message as message data', function() {
				socket.published.should.eql( [
					{
						success: false,
						status: 500,
						data: 'no support'
					}
				] );
			} );
		} );

		describe( 'with string result', function() {
			var envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket );
				envelope.handleReturn( {}, {}, {}, 'just a simple string' );
			} );

			it( 'should send string as message data', function() {
				socket.published.should.eql( [
					{
						success: true,
						status: 200,
						data: 'just a simple string'
					}
				] );
			} );
		} );

		describe( 'with string result and status code', function() {
			var envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket );
				envelope.handleReturn( {}, {}, {}, { status: 202, data: 'For me? Well I accept you!' } );
			} );

			it( 'should send string as message data', function() {
				socket.published.should.eql( [
					{
						success: true,
						status: 202,
						data: 'For me? Well I accept you!'
					}
				] );
			} );
		} );

		describe( 'with json result', function() {
			var envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket );
				envelope.handleReturn( {}, {}, {}, { a: 1, b: 2, c: 3 } );
			} );

			it( 'should send json as message data', function() {
				socket.published.should.eql( [
					{
						success: true,
						status: 200,
						data: { a: 1, b: 2, c: 3 }
					}
				] );
			} );
		} );

		describe( 'with explicit data property on result', function() {
			var envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket );
				envelope.handleReturn( {}, {}, {}, { data: { a: 1, b: 2, c: 3 } } );
			} );

			it( 'should use data property as message data', function() {
				socket.published.should.eql( [
					{
						success: true,
						status: 200,
						data: { a: 1, b: 2, c: 3 }
					}
				] );
			} );
		} );

		describe( 'with cookies and headers on result', function() {
			var envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( topic, message, socket );
				envelope.handleReturn( {}, {}, {}, {
					cookies: { 'one': {
							value: 'test',
							options: {}
						} },
					headers: {
						h1: 'this is a header',
						h2: 'so is this'
					},
					data: { a: 1, b: 2, c: 3 },
				} );
			} );

			it( 'should copy headers and remove cookies', function() {
				socket.published.should.eql( [
					{
						success: true,
						status: 200,
						data: { a: 1, b: 2, c: 3 },
						_headers: {
							h1: 'this is a header',
							h2: 'so is this'
						}
					}
				] );
			} );
		} );

		describe( 'with simple forward', function() {
			var envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( 'test.forward', message, socket );
				envelope.handleReturn( {}, {}, {}, {
					forward: {
						url: 'http://testing.com/forwarded'
					}
				} );
			} );

			it( 'should report unsupported call', function() {
				socket.published.should.eql( [
					{
						success: false,
						status: 400,
						data: 'The API call \'test.forward\' is not supported via websockets. Sockets do not support proxying via forwardTo.'
					}
				] );
			} );
		} );

		describe( 'with redirect', function() {
			var envelope, message, socket;
			before( function() {
				message = {
					data: {}
				};
				socket = createSocket();
				envelope = new Envelope( 'test.forward', message, socket );
			} );

			it( 'should throw an error', function() {
				expect( function() {
					envelope.handleReturn( {}, {}, {}, {
						redirect: {
							url: 'http://testing.com/redirect'
						}
					} );
				} ).to.throw( 'Sockets do not support redirection.' );
			} );

			it( 'should report unsupported call', function() {
				socket.published.should.eql( [
					{
						success: false,
						status: 400,
						data: 'The resource you are trying to reach has moved.'
					}
				] );
			} );
		} );

		describe( 'with file', function() {
			var envelope, message, socket, fauxStream;
			before( function() {
				message = {
					data: {}
				};
				fauxStream = {
					stream: undefined,
					pipe: function( stream ) {
						this.stream = stream;
					}
				};
				socket = createSocket();
				envelope = new Envelope( 'test.forward', message, socket );
				envelope.handleReturn( {}, {}, {}, {
					file: {
						type: 'text/plain',
						name: 'afile.txt',
						stream: fauxStream
					}
				} );
			} );

			it( 'should set headers', function() {
				socket.published.should.eql( [
					{
						start: true, fileName: 'afile.txt', contentType: 'text/plain'
					}
				] );

			} );
		} );
	} );
} );

function createSocket() {
	var socket = {
		headers: {
			cookie: ''
		},
		published: [],
		publish: function( topic, message ) {
			this.published.push( message );
		}
	};
	return socket;
}

function MyCustomError( message ) {
	this.message = message || ':(';
	this.name = 'MyCustom';
}

MyCustomError.prototype = Object.create( Error.prototype );
MyCustomError.constructor = MyCustomError;
