require( '../setup' );
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
var harnessFn = require( '../../src/harness' );

describe( 'Websocket', function() {
	var cookieExpiresAt;
	var harness;
	// * proxy action that allows an anon user to access an authenticated endpoint
	// * action that returns a file to an authenticated user
	// * action to capture various information from the incoming request and return it to the caller
	// * action to redirect to a different resource
	// * action that throws exception
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
			env.forwardTo( {} );
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
				proxy: { url: '/proxy/:one/:two/:three', method: 'post', topic: 'proxy', handle: anonProxy },
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

	describe( 'Sending args message (authenticated & authorized)', function() {
		var response, ws;
		before( function( done ) {
			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer one', Cookie: 'header-one=one' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'test.args' ) {
						response = json.data;
						done();
					}
				} );

				socket.sendUTF( JSON.stringify( {
					topic: 'test.args',
					data: {
						one: 'alpha',
						two: 'bravo',
						three: 'charlie',
						four: 'foxtrot'
					}
				} ) );
			} );
		} );

		it( 'should preserve overlapping values', function() {
			response.should.eql( { data: [ 'alpha', 'bravo', 'charlie', 'foxtrot', null, null, null, null ], _headers: { 'test-header': 'look a header value!' } } );
		} );
	} );

	describe( 'Sending args message (unauthenticated)', function() {
		var ws;
		before( function( done ) {

			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer none' } );
			ws.once( 'connectFailed', function() {
				done();
			} );
		} );

		it( 'should reject user as unauthenticated', function() {} );
	} );

	describe( 'Sending args message (unauthorized)', function() {
		var response, ws;
		before( function( done ) {
			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer two' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'test.args' ) {
						response = json.data;
						done();
					}
				} );

				socket.sendUTF( JSON.stringify( {
					topic: 'test.args',
					data: {
						one: 'alpha',
						two: 'bravo',
						three: 'charlie',
						four: 'foxtrot'
					}
				} ) );
			} );
		} );

		it( 'should reject user as unauthorized', function() {
			response.should.eql( 'User lacks sufficient permissions' );
		} );
	} );

	describe( 'Sending args message (exception on role check)', function() {
		var response, ws;
		before( function( done ) {
			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer three' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'test.args' ) {
						response = json.data;
						done();
					}
				} );

				socket.sendUTF( JSON.stringify( {
					topic: 'test.args',
					data: {
						one: 'alpha',
						two: 'bravo',
						three: 'charlie',
						four: 'foxtrot'
					}
				} ) );
			} );
		} );

		it( 'should reject user as unauthorized', function() {
			response.should.eql( 'User lacks sufficient permissions' );
		} );
	} );

	describe( 'Sending args message (exception on checkPermissions)', function() {
		var response, ws;
		before( function( done ) {
			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer four' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'test.args' ) {
						response = json.data;
						done();
					}
				} );

				socket.sendUTF( JSON.stringify( {
					topic: 'test.args',
					data: {
						one: 'alpha',
						two: 'bravo',
						three: 'charlie',
						four: 'foxtrot'
					}
				} ) );
			} );
		} );

		it( 'should reject user as unauthorized', function() {
			response.should.eql( 'User lacks sufficient permissions' );
		} );
	} );

	describe( 'Requesting temporarily moved resource', function() {
		var response, ws;
		before( function( done ) {
			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer one' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'test.thing' && !response ) {
						response = json.data;
						done();
					}
				} );

				socket.sendUTF( JSON.stringify( {
					topic: 'test.thing',
					data: {
						id: 100
					}
				} ) );
			} );
		} );

		it( 'should return the redirected item', function() {
			response.should.eql( 'The resource you are trying to reach has moved.' );
		} );
	} );

	describe( 'Making a request to a broken action', function() {
		var response, ws;
		before( function( done ) {
			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer one' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'test.error' && !response ) {
						response = json.data;
						done();
					}
				} );

				socket.sendUTF( JSON.stringify( {
					topic: 'test.error',
					data: {
						id: 100
					}
				} ) );
			} );
		} );

		it( 'should return error message', function() {
			response.should.eql( 'Server error at topic test.error' );
		} );
	} );

	describe( 'Making a request to a broken topic', function() {
		var response, ws;
		before( function( done ) {
			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer one' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'fail' && !response ) {
						response = json.data;
						done();
					}
				} );

				socket.sendUTF( JSON.stringify( {
					topic: 'fail',
					data: {
						id: 100
					}
				} ) );
			} );
		} );

		it( 'should return error message', function() {
			response.should.eql( 'Server error at topic fail' );
		} );
	} );

	describe( 'Proxy - Args (unsupported)', function() {
		var response, ws;
		before( function( done ) {
			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer one' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'test.proxy' && !response ) {
						response = json.data;
						done();
					}
				} );

				socket.sendUTF( JSON.stringify( {
					topic: 'test.proxy',
					data: {
						id: 100
					}
				} ) );
			} );
		} );

		it( 'should return error message', function() {
			response.should.eql( 'The API call \'test.proxy\' is not supported via websockets. Sockets do not support proxying via forwardTo.' );
		} );
	} );

	describe( 'Accessing static files from a resource static path', function() {
		var response = {
			buffers: [],
			total: 0
		};
		var ws, onMessage;
		before( function( done ) {
			onMessage = function( msg ) {
				if ( msg.start ) {
					response.metadata = msg;
				} else if ( msg.data ) {
					response.buffers.push( new Buffer( msg.data ) );
					response.total += msg.data.length;
				}
				if ( msg.end ) {
					response.bytes = Buffer.concat( response.buffers, response.total );
					done();
				}
			};

			ws = harness.getWSClient( 'http://localhost:8988/websocket', { Authorization: 'Bearer one' } );
			ws.once( 'connect', function( socket ) {
				socket.on( 'message', function( msg ) {
					var json = JSON.parse( msg.utf8Data );
					if ( json.topic === 'test.file' ) {
						onMessage( json.data );
					}
				} );
				socket.sendUTF( JSON.stringify( {
					topic: 'test.file',
					data: {
						id: 100
					}
				} ) );
			} );
		} );

		it( 'should return the file', function() {
			response.bytes.toString().should.eql( 'hello, world!' );
		} );

		after( function() {
			ws.removeListener( 'message', onMessage );
		} );
	} );

	describe( 'Without users', function() {

		before( function() {
			harness.clearUsers();
		} );

		describe( 'Sending args message without adequate permissions', function() {
			var response, ws;
			before( function( done ) {
				ws = harness.getWSClient( 'http://localhost:8988/websocket', {} );
				ws.once( 'connect', function( socket ) {
					socket.on( 'message', function( msg ) {
						var json = JSON.parse( msg.utf8Data );
						if ( json.topic === 'test.args' ) {
							response = json.data;
							done();
						}
					} );

					socket.sendUTF( JSON.stringify( {
						topic: 'test.args',
						data: {
							one: 'alpha',
							two: 'bravo',
							three: 'charlie',
							four: 'foxtrot'
						}
					} ) );
				} );
			} );

			it( 'should reject user as unauthorized', function() {
				response.should.eql( 'User lacks sufficient permissions' );
			} );
		} );

		describe( 'Sending args message with adequate permissions', function() {
			var response, ws;
			before( function( done ) {
				harness.setActionRoles( 'test.args', [] );
				ws = harness.getWSClient( 'http://localhost:8988/websocket', {} );
				ws.once( 'connect', function( socket ) {
					socket.on( 'message', function( msg ) {
						var json = JSON.parse( msg.utf8Data );
						if ( json.topic === 'test.args' ) {
							response = json.data;
							done();
						}
					} );

					socket.sendUTF( JSON.stringify( {
						topic: 'test.args',
						data: {
							one: 'alpha',
							two: 'bravo',
							three: 'charlie',
							four: 'foxtrot'
						}
					} ) );
				} );
			} );

			it( 'should preserve overlapping values', function() {
				response.should.eql( { data: [ 'alpha', 'bravo', 'charlie', 'foxtrot', null, null, null, null ], _headers: { 'test-header': 'look a header value!' } } );
			} );
		} );
	} );

	after( function() {
		harness.stop();
	} );
} );
