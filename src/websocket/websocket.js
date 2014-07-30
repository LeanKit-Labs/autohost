var _ = require( 'lodash' ),
	WS = require ( 'websocket' ).server,
	ServerResponse = require( 'http' ).ServerResponse,
	debug = require( 'debug' )( 'autohost:websocket' ),
	authStrategy,
	registry,
	socketServer,
	middleware,
	config;

function allowOrigin( origin ) {
	return ( config.origin && origin === config.origin ) || !config.origin;
}

function acceptSocketRequest( request ) {
	var protocol = request.requestedProtocols[ 0 ],
		socket = request.accept( protocol, request.origin );
	
	// grab user from request
	socket.user = {
		id: request.user.name,
		name: request.httpRequest.user.name 
	};

	// grab cookies parsed from middleware
	socket.cookies = request.cookies;

	// attach roles to user on socket
	if( authStrategy ) {
		authStrategy.getSocketRoles( socket.user.name )
			.then( function( roles ) {
				socket.user.roles = roles;
			} );
	}

	// reprocess generic message with topic sent
	socket.on( 'message', function( message ) {
		if( message.type === 'utf8' ) {
			var json = JSON.parse( message.utf8Data );
			this.emit( json.topic, json.data, socket );
		}
	} );

	// normalize socket publishing interface
	socket.publish = function( topic, message ) {
		var payload = JSON.stringify( { topic: topic, data: message } );
		this.sendUTF(payload);
	};

	var originalClose = socket.close;
	socket.close = function() {
		socket.removeAllListeners();
		originalClose();
		registry.remove( socket ); 
	}

	// if client identifies itself, register id
	socket.on( 'client.identity', function( data, socket ) {
		socket.id = data.id;
		registry.identified( id, socket );
	} );

	// add anonymous socket
	registry.add( socket );

	// subscribe to registered topics
	_.each( registry.topics, function( callback, topic ) {
		if( callback ) {
			socket.on( topic, function( data, socket ) { callback( data, socket ); } );
		}
	} );

	socket.publish( 'server.connected', { user: socket.user } );
	socket.on( 'close', function() { 
		registry.remove( socket ); 
	} );
}

function configureWebsocket( http ) {
	if( config.websockets || config.websocket ) {
		middleware = http.getAuthMiddleware();
		socketServer = new WS( { 
			httpServer: http.server,
			autoAcceptConnections: false 
		} );
		socketServer.on( 'request', handleWebSocketRequest );
	}
}

function handleWebSocketRequest( request ) {
	// if this doesn't end in websocket, we should ignore the request, it isn't for this lib
	if( !/websocket[\/]?$/.test( request.resourceURL.path ) ) {
		return;
	}

	// check origin
	if( !allowOrigin( request.origin ) ) {
		request.reject();
		return;
	}

	var allowed,
		response = new ServerResponse( request.httpRequest );
	response.assignSocket( request.socket );
	middleware
		.handle( request.httpRequest, response, function( err ) {
			if( err || !request.httpRequest.user ) {
				request.reject( 401, 'Authentication Required', { 'WWW-Authenticate': 'Basic' } );
			} else {
				request.user = request.httpRequest.user;
				acceptSocketRequest( request );
			}
		} );
}

function stop() {
	socketServer.shutDown();
}

module.exports = function( cfg, reg, auth ) {
	config = cfg;
	authStrategy = auth;
	registry = reg;
	return {
		config: configureWebsocket,
		stop: stop
	};
};