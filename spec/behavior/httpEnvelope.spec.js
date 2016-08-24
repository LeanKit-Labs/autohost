require( '../setup' );
var path = require( 'path' );
var envelopeFn = require( '../../src/http/httpEnvelope.js' );
var util = require( 'util' );
var lastRequest;

setupLog( "autohost.http.envelope", 1 );

describe( 'HTTP Envelope', function() {
	describe( 'when handling errors', function() {
		describe( 'with host defined custom error', function() {
			var envelope, req, res, request, host, renderSpy;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				renderSpy = sinon.spy( envelope, 'render' );
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

			it( 'should use 500 status and create body from reply method', function() {
				res.sent.should.eql( {
					status: 500,
					body: 'MyCustom: test'
				} );
			} );

			it( 'should call envelope render to generate the reply', function() {
				renderSpy.should.have.been.calledOnce;
			} );

			after( function() {
				renderSpy.restore();
			} );
		} );

		describe( 'with overlapping generic error handlers', function() {
			var envelope, req, res, request, host, resource;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				host = {
					errors: {
						'Error': {
							status: 500
						}
					}
				};
				resource = {
					errors: {
						'Error': {
							status: 505,
							reply: function( error ) {
								return 'this is silly: ' + error.message;
							}
						}
					}
				};
				envelope.handleReturn( host, resource, {}, new Error( 'test' ) );
			} );

			it( 'should use 500 status and create body from reply method', function() {
				res.sent.should.eql( {
					status: 505,
					body: 'this is silly: test'
				} );
			} );
		} );

		describe( 'with existing file error', function() {
			var envelope, req, res, request, host;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				host = {
					static: './spec/public',
					errors: {
						'Error': {
							status: 500,
							file: './myError.html'
						}
					}
				};
				envelope.handleReturn( host, {}, {}, new Error( 'test' ) );
			} );

			it( 'should use 500 status', function( done ) {
				setTimeout( function() {
					res.sent.should.eql( {
						status: 500,
						body: '<html>\n\t<body>Behold, yon error!</body>\n</html>'
					} );
					done();
				}, 50 );
			} );

			it( 'should set content-type header only', function() {
				res.headers.should.eql( {
					'Content-Type': 'text/html'
				} );
			} );
		} );

		describe( 'with missing file error', function() {
			var envelope, req, res, request, host;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				host = {
					static: './spec/public',
					errors: {
						'Error': {
							status: 500,
							file: './myUrrur.html'
						}
					}
				};
				envelope.handleReturn( host, {}, {}, new Error( 'default error message' ) );
			} );

			it( 'should fall back to default error handling', function() {
				res.sent.should.eql( {
					status: 500,
					body: { message: 'Server error' }
				} );
			} );
		} );

		describe( 'with resource defined custom error', function() {
			var envelope, req, res, request, resource;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
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

			it( 'should use custom status and custom body', function() {
				res.sent.should.eql( {
					status: 404,
					body: 'NEVER EVER'
				} );
			} );
		} );

		describe( 'with action defined custom error', function() {
			var envelope, req, res, request, action;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				action = {
					errors: {
						'MyCustom': {
							status: 401
						}
					}
				};
				envelope.handleReturn( {}, {}, action, new MyCustomError( 'a test' ) );
			} );

			it( 'should use custom status and default error message as body', function() {
				res.sent.should.eql( {
					status: 401,
					body: { message: 'Server error' }
				} );
			} );
		} );

		describe( 'with undefined custom error', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, new MyCustomError( 'no support' ) );
			} );

			it( 'should default to 500 status and default error message', function() {
				res.sent.should.eql( {
					status: 500,
					body: { message: 'Server error' }
				} );
			} );
		} );

		describe( 'with status less than 500', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				host = {
					errors: {
						'MyCustom': {
							status: 404,
							reply: function( error ) {
								return util.format( '%s: %s', error.name, error.message );
							}
						}
					}
				};
				logAdapter.reset();
				envelope.handleReturn( host, {}, {}, new MyCustomError( 'test' ) );
			} );

			it( 'should not log', function() {
				logAdapter.recent().should.eql( {} );
			} );
		} );

		describe( 'with status of 500', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				host = {
					errors: {
						'MyCustom': {
							reply: function( error ) {
								return util.format( '%s: %s', error.name, error.message );
							}
						}
					}
				};
				logAdapter.reset();
				envelope.handleReturn( host, {}, {}, new MyCustomError( 'test' ) );
			} );

			it( 'should log the exception as an error', function() {
				logAdapter.recent( 'error' )[0].should.equal( 'ahspec [anonymous] \nMyCustom: test' );
			} );
		} );

		describe( 'with status greater than 500', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				host = {
					errors: {
						'MyCustom': {
							status: 503,
							reply: function( error ) {
								return util.format( '%s: %s', error.name, error.message );
							}
						}
					}
				};
				logAdapter.reset();
				envelope.handleReturn( host, {}, {}, new MyCustomError( 'test' ) );
			} );

			it( 'should log the exception as an error', function() {
				logAdapter.recent( 'error' )[0].should.equal( 'ahspec [anonymous] \nMyCustom: test' );
			} );
		} );
	} );
	describe( 'when handling return', function() {
		describe( 'with string result', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, 'just a simple string' );
			} );

			it( 'should send string as body', function() {
				res.sent.should.eql( {
					status: 200,
					body: 'just a simple string'
				} );
			} );
		} );

		describe( 'with string result and status code', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, { status: 202, data: 'For me? Well I accept you!' } );
			} );

			it( 'should send data as body', function() {
				res.sent.should.eql( {
					status: 202,
					body: 'For me? Well I accept you!'
				} );
			} );
		} );

		describe( 'with json result', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, { a: 1, b: 2, c: 3 } );
			} );

			it( 'should send json as body', function() {
				res.sent.should.eql( {
					status: 200,
					body: { a: 1, b: 2, c: 3 }
				} );
			} );
		} );

		describe( 'with explicit data property on result', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, { data: { a: 1, b: 2, c: 3 } } );
			} );

			it( 'should strip data property and use as response body', function() {
				res.sent.should.eql( {
					status: 200,
					body: { a: 1, b: 2, c: 3 }
				} );
			} );
		} );

		describe( 'with cookies and headers on result', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
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

			it( 'should strip data property and use as response body', function() {
				res.sent.should.eql( {
					status: 200,
					body: { a: 1, b: 2, c: 3 }
				} );
			} );

			it( 'should include cookies', function() {
				res.cookies.should.eql(
					{
						'one': {
							value: 'test',
							options: {}
						}
					}
				);
			} );

			it( 'should include headers', function() {
				res.headers.should.eql(
					{
						h1: 'this is a header',
						h2: 'so is this'
					}
				);
			} );
		} );

		describe( 'with simple forward', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.method = 'GET';
				req.headers = [];
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, {
					forward: {
						url: 'http://testing.com/forwarded'
					}
				} );
			} );

			it( 'forward original request to new url', function() {
				lastRequest.opts.should.eql( {
					headers: [],
					method: 'GET',
					url: 'http://testing.com/forwarded'
				} );

				lastRequest.piped.should.equal( res );
			} );
		} );

		describe( 'with forward and custom method', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.method = 'PUT';
				req.headers = [];
				req.body = { something: 'important' };
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, {
					forward: {
						method: 'POST',
						url: 'http://testing.com/forwarded'
					}
				} );
			} );

			it( 'forward original request to new url', function() {
				lastRequest.opts.should.eql( {
					headers: [],
					method: 'POST',
					url: 'http://testing.com/forwarded',
					json: true,
					body: { something: 'important' }
				} );

				lastRequest.piped.should.equal( res );
			} );
		} );

		describe( 'with forward and custom headers', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.method = 'PUT';
				req.headers = [];
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, {
					forward: {
						headers: {
							'test': 'a test'
						},
						method: 'POST',
						url: 'http://testing.com/forwarded'
					}
				} );
			} );

			it( 'forward original request to new url', function() {
				lastRequest.opts.should.eql( {
					headers: {
						'test': 'a test'
					},
					method: 'POST',
					url: 'http://testing.com/forwarded'
				} );

				lastRequest.piped.should.equal( res );
			} );
		} );

		describe( 'with forward and custom body', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.method = 'PUT';
				req.headers = [];
				req.body = { something: 'important' };
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, {
					forward: {
						method: 'POST',
						url: 'http://testing.com/forwarded',
						body: { custom: { something: 'else' } }
					}
				} );
			} );

			it( 'forward original request to new url', function() {
				lastRequest.opts.should.eql( {
					headers: [],
					method: 'POST',
					url: 'http://testing.com/forwarded',
					json: true,
					body: { custom: { something: 'else' } }
				} );

				lastRequest.piped.should.equal( res );
			} );
		} );

		describe( 'with redirect and default status', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, {
					redirect: {
						url: 'http://testing.com/redirect'
					}
				} );
			} );

			it( 'should respond with 302 and url', function() {
				res.sent.should.eql( {
					status: 302,
					url: 'http://testing.com/redirect'
				} );
			} );
		} );

		describe( 'with redirect', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, {
					redirect: {
						status: 301,
						url: 'http://testing.com/redirect'
					}
				} );
			} );

			it( 'should respond with 301 and url', function() {
				res.sent.should.eql( {
					status: 301,
					url: 'http://testing.com/redirect'
				} );
			} );
		} );

		describe( 'with file', function() {
			var envelope, req, res, request, fauxStream;
			before( function() {
				res = createResponse();
				req = createRequest();
				request = stubRequest();
				fauxStream = {
					stream: undefined,
					pipe: function( stream ) {
						this.stream = stream;
					}
				};
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, {
					file: {
						type: 'text/plain',
						name: 'afile.txt',
						stream: fauxStream
					}
				} );
			} );

			it( 'should set headers', function() {
				res.headers.should.eql( {
					'Content-Disposition': 'attachment; filename="afile.txt"',
					'Content-Type': 'text/plain'
				} );
			} );

			it( 'should pipe stream to response', function() {
				fauxStream.stream.should.equal( res );
			} );
		} );

		describe( 'with overridden render', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.extendHttp = {
					render: function() {
						return { status: 203, data: 'I do what I want!' };
					}
				};
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				envelope.handleReturn( {}, {}, {}, 'just a simple string' );
			} );

			it( 'should send string as body', function() {
				res.sent.should.eql( {
					status: 203,
					body: 'I do what I want!'
				} );
			} );
		} );
	} );

	describe( 'when parsing incoming request', function() {
		describe( 'with query parameters', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.query = {
					one: 1,
					two: 2
				};
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
			} );

			it( 'should place query parameters on envelope data', function() {
				envelope.data.should.eql( {
					one: 1,
					two: 2
				} );
			} );
		} );
		describe( 'with path variables', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.params = {
					one: 1,
					two: 2
				};
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
			} );

			it( 'should place query parameters on envelope data', function() {
				envelope.data.should.eql( {
					one: 1,
					two: 2
				} );
			} );
		} );
		describe( 'with query parameters and path variables', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.params = {
					one: 1,
					two: 2
				};
				req.query = {
					one: 3,
					two: 4
				};
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
			} );

			it( 'should not override path variables with query parameters on data', function() {
				envelope.data.should.eql( {
					one: 1,
					two: 2
				} );
			} );

			it( 'should not override path variables with query parameters on params', function() {
				envelope.params.should.eql( {
					one: 1,
					two: 2
				} );
			} );
		} );

		describe( 'with query parameters and path variables and body properties', function() {
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.body = {
					one: 'one',
					two: 'two'
				};
				req.params = {
					one: 1,
					two: 2
				};
				req.query = {
					one: 3,
					two: 4
				};
				request = stubRequest();
				envelope = new ( envelopeFn( request ) )( req, res, 'test' );
			} );

			it( 'should not override body properties', function() {
				envelope.data.should.eql( {
					one: 1,
					two: 2
				} );
			} );

			it( 'should not override path variables with query parameters on params', function() {
				envelope.params.should.eql( {
					one: 1,
					two: 2
				} );
			} );
		} );

		describe( 'with body without hasOwnProperty', function() {
			// The multer library, which is used for handling multipart form posts,
			// sets the request body to Object.create( null ), which yields an object
			// without the almost ubiquitous hasOwnProperty function.
			// HttpEnvelope was using this function on the request body, which was
			// blowing up on multipart forms. This example is just to recreate that case.
			var envelope, req, res, request;
			before( function() {
				res = createResponse();
				req = createRequest();
				req.body = Object.create( null );
				req.one = 'one';
				req.two = 'two';
				req.params = {
					one: 1,
					two: 2
				};
				req.query = {
					one: 3,
					two: 4
				};
				request = stubRequest();
			} );

			it( 'should not throw TypeError: undefined is not a function', function() {
				expect( function() {
					envelope = new ( envelopeFn( request ) )( req, res, 'test' );
				} ).to.not.throw( TypeError );
			} );
		} );
	} );
} );

function stubRequest() {
	return function( opts ) {
		var r = {
			opts: opts,
			piped: undefined,
		};
		_.merge( r, {
			pipe: function( stream ) {
				this.piped = stream;
			}.bind( r )
		} );
		lastRequest = r;
		return r;
	};
}

function createRequest() {
	return {
		params: {},
		query: {},
		method: "GET"
	};
}

function createResponse() {
	var res = {
		headers: {},
		cookies: {},
		sent: {}
	};
	_.merge( res, {
		cookie: function( k, c, o ) {
			this.cookies[ k ] = {
				value: c,
				options: o
			};
		},
		pipe: function( r ) {
			return r;
		},
		redirect: function( code, url ) {
			this.sent.status = code;
			this.sent.url = url;
		}.bind( res ),
		send: function( data ) {
			if ( data ) {
				this.sent.body = data;
			}
			return this;
		}.bind( res ),
		set: function( k, v ) {
			if ( _.isObject( k ) ) {
				_.each( k, function( val, h ) {
					this.headers[ h ] = val;
				}.bind( this ) );
			} else {
				this.headers[ k ] = v;
			}
		}.bind( res ),
		write: function( chunk ) {
			this.sent.body = this.sent.body || '';
			if ( chunk ) {
				this.sent.body += chunk;
			}
		},
		end: _.noop,
		on: _.noop,
		once: _.noop,
		emit: _.noop,
		removeListener: _.noop,
		status: function( code ) {
			this.sent.status = code;
			return this;
		}.bind( res )
	} );

	return res;
}

function MyCustomError( message ) {
	this.message = message || ':(';
	this.name = 'MyCustom';
	this.stack = this.name + ": " + this.message;
}

MyCustomError.prototype = Object.create( Error.prototype );
MyCustomError.constructor = MyCustomError;
