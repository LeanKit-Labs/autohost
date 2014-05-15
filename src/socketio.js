var _ = require( 'lodash' ),
	socketio = require( 'socket.io' );

module.exports = function( Host ) {


	Host.prototype.authSocketIO = function( handshake, callback ) {
		if( this.authenticationStrategy ) {
			var success = 	function( user, id ) {
								handshake.user = user;
								handshake.id = id;
								callback( null, true );
							}.bind( this ),
				failure	= 	function( status, challenge ) {
								var reject;
								if( status == 400 ) {
									reject = { status: status, reason: 'Invalid credentials' };
								} else {
									reject = { status: 401, reason: 'Authentication Required' };
								}
								callback( reject, false );
							},
				request = 	{
								headers: handshake.headers,
								url: handshake.url,
								query: handshake.query
							};
				strategy = this.getSocketAuthenticationStrategy( request, success, failure );
			strategy.authenticate( request );	
		} else {
			handshake.user = 'anonymous';
			callback( null, true );
		}
	};

	Host.prototype.setupSocketIOAuth = function () {
		io.configure( function() {
			io.set( 'authentication', _.bind( this.authSocketIO, this ) );
		}.bind( this ) );
	};

	Host.prototype.configureSocketIO = function() {
		var config = this.config.socketIO,
			io;
		if( config ) {
			if( _.isObject( config ) ) {
				io = socketio.listen( config.port );
			} else {
				io = socketio.listen( this.server );
			}
			io.set( 'log level', 1 );
			
			io.on( 'connection', function( socket ) {
				var handshake = socket.handshake;
				socket.user = {
					id: handshake.id || handshake.user || 'anonymous',
					name: handshake.user || 'anonymous' 
				};

				if( this.authorizer ) {
					this.authorizer.getUserRoles( socket.user, function( err, roles ) {
						if ( err ) {
							socket.publish( 'authorization.error', { error: 'Could not determine permissions for user "' + socket.user +'"'} );
						} else {
							socket.user.roles = roles;
						}
					} );
				}

				socket.publish = function( topic, message ) {
					socket.json.send( { topic: topic, body: message } );
				};

				socket.on( 'client.identity', function( data ) {
					socket.id = data.id;
					this.clients.lookup[ data.id ] = socket;
					this.emit( 'socket.client.identified', { socket: socket, id: data.id } );
				}.bind( this ) );

				this.clients.push( socket );

				_.each( this.topics, function( callback, topic ) {
					if( callback ) {
						socket.on( topic, function( data ) { callback( data, socket ); } );
					}
				} );

				this.emit( 'socket.client.connected', { socket: socket } );
				socket.publish( 'server.connected', { user: socket.user } );
				socket.on( 'disconnect', function() { this.removeClient( socket ); }.bind( this ) );
			}.bind( this ) );

			this.io = io;
		}
	};
};
