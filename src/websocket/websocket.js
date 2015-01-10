var authStrategy;
var registry;
var socketServer;
var middleware;
var config;
var _ = require( 'lodash' );
var WS = require ( 'websocket' ).server;
var ServerResponse = require( 'http' ).ServerResponse;
var debug = require( 'debug' )( 'autohost:websocket' );

function allowOrigin( origin ) {
	return ( config.origin && origin === config.origin ) || !config.origin;
}

function acceptSocketRequest( request ) {
	debug( 'Processing websocket connection attempt' );

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
	if ( authStrategy ) {
		authStrategy.getSocketRoles( socket.user )
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
		debug( 'Closing websocket client (user: %s)', JSON.stringify( socket.user ) );
		socket.removeAllListeners();
		originalClose();
		registry.remove( socket );
	};

	// if client identifies itself, register id
	socket.on( 'client.identity', function( data, socket ) {
		socket.id = data.id;
		registry.identified( socket.id, socket );
	} );

	// add anonymous socket
	registry.add( socket );

	// subscribe to registered topics
	_.each( registry.topics, function( callback, topic ) {
		if ( callback ) {
			socket.on( topic, function( data, socket ) {
				callback( data, socket );
			} );
		}
	} );

	socket.publish( 'server.connected', { user: socket.user } );
	socket.on( 'close', function() {
		debug( 'websocket client disconnected (user: %s)', JSON.stringify( socket.user ) );
		registry.remove( socket );
	} );
	debug( 'Finished processing websocket connection attempt' );
}

function configureWebsocket( http ) {
	if ( config.websockets || config.websocket ) {
		middleware = authStrategy ? http.getAuthMiddleware() : http.getMiddleware();
		socketServer = new WS( {
				httpServer: http.server,
				autoAcceptConnections: false
			} );
		socketServer.on( 'request', handleWebSocketRequest );
	}
}

function handleWebSocketRequest( request ) { // jshint ignore:line
	// if this doesn't end in websocket, we should ignore the request, it isn't for this lib
	if ( !/websocket[\/]?$/.test( request.resourceURL.path ) ) {
		debug( 'Websocket connection attempt (%s) does not match allowed URL /websocket', request.resourceURL.path );
		return;
	}

	// check origin
	if ( !allowOrigin( request.origin ) ) {
		debug( 'Websocket origin (%s) does not match allowed origin %s', request.origin, config.origin );
		request.reject();
		return;
	}

	var response = new ServerResponse( request.httpRequest );
	response.assignSocket( request.socket );
	if ( authStrategy ) {
		middleware
			.handle( request.httpRequest, response, function( err ) {
				if ( err || !request.httpRequest.user ) {
					debug( 'Websocket connection rejected: authentication required' );
					request.reject( 401, 'Authentication Required', { 'WWW-Authenticate': 'Basic' } );
				} else {
					debug( 'Websocket connection accepted as user %s', JSON.stringify( request.httpRequest.user ) );
					request.user = request.httpRequest.user;
					request.session = request.httpRequest.session;
					acceptSocketRequest( request );
				}
			} );
	} else {
		request.user = {
				id: 'anonymous',
				name: 'anonymous',
				roles: []
			};
		acceptSocketRequest( request );
	}
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
