var _ = require( 'lodash' );
var WS = require ( 'websocket' ).server;
var ServerResponse = require( 'http' ).ServerResponse;
var log = require( '../log' )( 'autohost.websocket' );

function allowOrigin( state, origin ) {
	return ( state.config.origin && origin === state.config.origin ) || !state.config.origin;
}

function acceptSocketRequest( state, request ) {
	log.debug( 'Processing websocket connection attempt' );

	var protocol = request.requestedProtocols[ 0 ];
	var socket = request.accept( protocol, request.origin );

	socket.user = request.user || {
		id: 'anonymous',
		name: 'anonymous'
	};


	// grab session and cookies parsed from middleware
	socket.session = request.session;
	socket.cookies = request.cookies;

	// attach roles to user on socket
	if ( state.authProvider ) {
		state.authProvider.getSocketRoles( socket.user )
			.then( function( roles ) {
				socket.user.roles = roles;
			} );
	}

	// attach context on request to socket
	socket.context = request.httpRequest.context;

	// reprocess generic message with topic sent
	socket.on( 'message', function( message ) {
		if ( message.type === 'utf8' ) {
			var json = JSON.parse( message.utf8Data );
			this.emit( json.topic, json.data, socket );
		}
	} );

	// normalize socket publishing interface
	socket.publish = function( topic, message ) {
		var payload = JSON.stringify( { topic: topic, data: message } );
		this.sendUTF( payload );
	};

	var originalClose = socket.close;
	socket.close = function() {
		log.debug( 'Closing websocket client (user: %j)', socket.user );
		socket.removeAllListeners();
		originalClose();
		state.registry.remove( socket );
	};

	// add a way to end session
	socket.logout = request.logout || request.httpRequest.logout;

	// if client identifies itself, register id
	socket.on( 'client.identity', function( data, socket ) {
		socket.id = data.id;
		state.registry.identified( socket.id, socket );
	} );

	// add anonymous socket
	state.registry.add( socket );

	// subscribe to registered topics
	_.each( state.registry.topics, function( callback, topic ) {
		if ( callback ) {
			socket.on( topic, function( data, socket ) {
				callback( data, socket );
			} );
		}
	} );

	socket.publish( 'server.connected', { user: socket.user } );
	socket.on( 'close', function() {
		log.debug( 'websocket client disconnected (user: %j)', socket.user );
		state.registry.remove( socket );
	} );
	log.debug( 'Finished processing websocket connection attempt' );
}

function configureWebsocket( state, http ) {
	if ( state.config.websockets || state.config.websocket ) {
		state.middleware = state.authProvider ? http.getAuthMiddleware() : http.getMiddleware();
		state.socketServer = new WS( {
			httpServer: http.server,
			autoAcceptConnections: false
		} );
		state.socketServer.on( 'request', handleWebSocketRequest.bind( undefined, state ) );
	}
}

function handle( state, topic, callback ) {
	_.each( state.registry.clients, function( client ) {
		if ( client.type !== 'socketio' ) {
			client.on( topic, function( data ) {
				callback( data, client );
			} );
		}
	} );
}

function handleWebSocketRequest( state, request ) {
	// if this doesn't end in websocket, we should ignore the request, it isn't for this lib
	if ( !/websocket[\/]?$/.test( request.resourceURL.path ) ) {
		log.debug( 'Websocket connection attempt (%s) does not match allowed URL /websocket', request.resourceURL.path );
		return;
	}

	// check origin
	if ( !allowOrigin( state, request.origin ) ) {
		log.debug( 'Websocket origin (%s) does not match allowed origin %s', request.origin, state.config.origin );
		request.reject();
		return;
	}

	var response = new ServerResponse( request.httpRequest );
	response.assignSocket( request.socket );
	if ( state.authProvider ) {
		state.middleware
			.handle( request.httpRequest, response, function( err ) {
				if ( err || !request.httpRequest.user ) {
					log.debug( 'Websocket connection rejected: authentication required' );
					request.reject( 401, 'Authentication Required', { 'WWW-Authenticate': 'Basic' } );
				} else {
					log.debug( 'Websocket connection accepted as user %j', request.httpRequest.user );
					request.user = request.httpRequest.user;
					request.session = request.httpRequest.session;
					request.cookies = request.httpRequest.cookies;
					request.headers = request.httpRequest.headers;
					acceptSocketRequest( state, request );
				}
			} );
	} else {
		request.user = {
			id: 'anonymous',
			name: 'anonymous',
			roles: []
		};
		acceptSocketRequest( state, request );
	}
}

function stop( state ) {
	state.socketServer.shutDown();
}

module.exports = function( config, registry, authProvider ) {
	var state = {
		config: config,
		registry: registry,
		authProvider: authProvider
	};
	_.merge( state, {
		configure: configureWebsocket.bind( undefined, state ),
		on: handle.bind( undefined, state ),
		stop: stop.bind( undefined, state )
	} );
	return state;
};
