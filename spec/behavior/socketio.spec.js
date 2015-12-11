var path = require( 'path' );
var proxyquire = require( 'proxyquire' ).noPreserveCache();

describe( 'SocketIO', function() {
	describe( 'with SocketIO Configuration', function() {
		var instance, moduleStubs, ioStub, httpStub, registryStub;
		before( function() {
			ioStub = {
				on: sinon.stub(),
				removeAllListeners: sinon.stub(),
				close: sinon.stub(),
				engine: {}
			};

			ioFactory = sinon.stub().returns( ioStub );

			httpStub = {
				server: 'someserver',
				getAuthMiddleware: sinon.stub().returns( {
					use: sinon.stub()
				} )
			};

			registryStub = {
				clients: [],
				remove: sinon.stub(),
				identified: sinon.stub(),
				add: sinon.stub()
			};

			moduleStubs = {
				'socket.io': ioFactory
			};
			instanceFactory = proxyquire( path.resolve( __dirname, '../../src/websocket/socketio.js' ), moduleStubs );
			instance = instanceFactory( {
				socketio: {
					pingTimeout: 123456789,
					pingInterval: 987654321,
					transports: [ 'polling', 'websocket' ]
				}
			}, registryStub );
			instance.configure( httpStub );
		} );

		it( 'should pass the socketio config into socketio module', function() {
			ioFactory.should.be.calledWith( 'someserver', {
				pingTimeout: 123456789,
				pingInterval: 987654321,
				transports: [ 'polling', 'websocket' ],
				destroyUpgrade: false
			} );
		} );

		describe( 'when establishing a new connection', function() {
			var socketStub;
			before( function() {
				socketStub = {
					request: {
						headers: {
							cookie: 'yumyum=nomnom;chocchip=chewy'
						},
						session: {}
					},
					emit: sinon.stub(),
					removeAllListeners: sinon.stub(),
					disconnect: sinon.stub(),
					close: sinon.stub(),
					on: sinon.stub()
				};
				ioStub.on.callArgWith( 1, socketStub );
			} );

			it( 'should set the socket type', function() {
				socketStub.type.should.equal( 'socketio' );
			} );

			it( 'should set a user if request lacks one', function() {
				socketStub.user.should.eql( { id: 'anonymous', name: 'anonymous' } );
			} );

			it( 'should copy the session to the socket', function() {
				socketStub.session.should.equal( socketStub.request.session );
			} );

			it( 'should parse cookie(s) into socket cookies property', function() {
				socketStub.cookies.should.eql( {
					yumyum: 'nomnom',
					chocchip: 'chewy'
				} );
			} );

			describe( 'when the client identifies itself', function() {
				var fakeIdData;
				before( function() {
					fakeIdData = {
						id: 'oh, hai'
					};
					socketStub.on.callArgWith( 1, fakeIdData );
				} );

				it( 'should set the socket id', function() {
					socketStub.id.should.equal( 'oh, hai' );
				} );

				it( 'should add socket to the registry', function() {
					registryStub.add.should.be.calledWith( socketStub );
				} );
			} );
		} );

		describe( 'when registering a handler for client events', function() {
			var fakeClient, cbStub;
			before( function() {
				fakeClient = {
					type: 'socketio',
					on: sinon.stub()
				};
				registryStub.clients = [ fakeClient ];
				cbStub = sinon.stub();
				instance.on( 'a.topic', cbStub );
			} );

			it( 'should register a callback with the client', function() {
				fakeClient.on.should.be.calledWithMatch( 'a.topic', sinon.match.func );
			} );

			it( 'should invoke registed callback on client events', function() {
				fakeClient.on.callArgWith( 1, { foo: 'bar' } );
				cbStub.should.be.calledWithMatch( { foo: 'bar' }, fakeClient );
			} );
		} );
	} );
} );
