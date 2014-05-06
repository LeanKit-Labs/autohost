var _ = require( 'lodash' ),
	WS = require ( 'websocket' ).server;

module.exports = function( Host ) {

	Host.prototype.allowOrigin = function( origin ) {
		return origin == this.config.origin;
	};

	Host.prototype.acceptSocketRequest = function( user, id, request ) {
		var protocol = request.requestedProtocols[ 0 ];
		var socket = request.accept( protocol, request.origin );
		
		socket.user = {
			id: id || user || 'anonymous',
			name: user || 'anonymous' 
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

		socket.on( 'message', function( message ) {
			if( message.type == 'utf8' ) {
				var json = JSON.parse( message.utf8Data );
				this.emit( json.topic, json.body, socket );
			}
		} );

		socket.publish = function( topic, message ) {
			var payload = JSON.stringify( { topic: topic, body: message } );
			this.sendUTF(payload);
		};

		socket.on( 'client.identity', function( data, socket ) {
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
		socket.on( 'close', function() { this.removeClient(socket); }.bind( this ) );
	};

	Host.prototype.configureWebsockets = function() {
		if( this.config.websockets ) {
			this.socketServer = new WS( { httpServer: this.server, autoAcceptConnections: false } );
			this.socketServer.on( 'request', this.handleWebSocketRequest.bind( this ) );
		}
	};

	Host.prototype.handleWebSocketRequest = function( request ) {
		if( !this.allowOrigin( request.origin ) ) {
			request.reject();
			return;
		}
		
		if( this.authenticationStrategy ) {
			var success = 	function( user, id ) {
								this.acceptSocketRequest( user, id, request );
							}.bind( this ),
				failure	= 	function( status, challenge ) {
								if( status == 400 ) {
									request.reject( status, 'Invalid credentials' );
								} else {
									request.reject( 401, 'Authentication Required', { 'WWW-Authenticate': status } );
								}
							};
				strategy = this.getSocketAuthenticationStrategy( request, success, failure );
			strategy.authenticate( request.httpRequest );	
		} else {
			this.acceptSocketRequest( 'anonymous', request );
		}
	};

	Host.prototype.notifyClients = function( message, data ) {
		_.each( this.clients, function( client ) {
			client.publish( message, data );
		}.bind( this ) );
	};

	Host.prototype.removeClient = function( socket ) {
		var index = this.clients.indexOf( socket );
		if( index >= 0 ) {
			this.clients.splice( index, 1 );
			this.emit( 'socket.client.closed', { socket: socket, id: socket.id } );
		}
		if( socket.id ) {
			delete this.clients.lookup[ socket.id ];
		}
	};

	Host.prototype.sendToClient = function( id, message, data ) {
		var socket = this.clients.lookup[ id ];
		if( !socket ) {
			socket = this.clients.find( this.clients, function( client ) {
				return client.user.id == id || client.user.name == id;
			}.bind( this ) );
		}
		if( socket ) {
			socket.publish( message, data );
			return true;
		} else {
			return false;
		}
	};

};