var _ = require( 'lodash' );
var socketio = require( 'socket.io' );
var log = require( '../log' )( 'autohost.socketio' );
var authStrategy;
var registry;
var config;
var io;
var middleware;

function acceptSocket( socket ) {
	log.debug( 'Processing socket.io connection attempt' );

	var request = socket.request;
	socket.type = 'socketio';
	// grab user from request
	socket.user = request.user || {
		id: 'anonymous',
		name: 'anonymous'
	};

	// copy session from request
	socket.session = request.session;

	// copy cookies from request from middleware
	socket.cookies = {};
	if ( request.headers.cookie ) {
		_.each( request.headers.cookie.split( ';' ), function( cookie ) {
			var crumbs = cookie.split( '=' );
			socket.cookies[ crumbs[ 0 ].trim() ] = crumbs[ 1 ].trim();
		} );
	}

	// attach roles to user on socket
	if ( authStrategy ) {
		authStrategy.getSocketRoles( socket.user )
			.then( null, function( /* err */ ) {
				return [];
			} )
			.then( function( roles ) {
				socket.user.roles = roles;
			} );
	}

	// attach context on request to socket
	socket.context = request.context;

	// normalize socket publishing interface
	socket.publish = function( topic, message ) {
		socket.emit( topic, message );
	};

	// add a way to close a socket
	socket.close = function() {
		log.debug( 'Closing socket.io client (user: %s)', JSON.stringify( socket.user ) );
		socket.removeAllListeners();
		socket.disconnect( true );
		registry.remove( socket );
	};

	// add a way to end session
	socket.logout = function() {
		request.logout();
		socket.close();
	};

	// if client identifies itself, register id
	socket.on( 'client.identity', function( data ) {
		log.debug( 'Client sent identity %s', JSON.stringify( data ) );
		socket.id = data.id;
		registry.identified( data.id, socket );
	} );

	// add anonymous socket
	registry.add( socket );

	// subscribe to registered topics
	_.each( registry.topics, function( callback, topic ) {
		if ( callback ) {
			socket.on( topic, function( data ) {
				callback( data, socket );
			} );
		}
	} );

	socket.publish( 'server.connected', { user: socket.user } );
	socket.on( 'disconnect', function() {
		log.debug( 'socket.io client disconnected (user: %s)', JSON.stringify( socket.user ) );
		socket.removeAllListeners();
		registry.remove( socket );
	} );
}

function authSocketIO( req, allow ) {
	var allowed;
	if ( authStrategy ) {
		middleware
			.use( '/', function( hreq, hres, next ) {
				log.debug( 'Setting socket.io connection user to %s', JSON.stringify( hreq.user ) );
				allowed = hreq.user;
				next();
			} )
			.handle( req, req.res, function( err ) {
				if ( err ) {
					log.debug( 'Error in authenticating socket.io connection %s', err.stack );
					allow( err );
				} else {
					log.debug( 'Authenticated socket.io connection as user %s', allowed );
					allow( null, allowed );
				}
			} );
	} else {
		allow( null, { id: 'anonymous', name: 'anonymous', roles: [] } );
	}
}

function configureSocketIO( http ) {
	io = socketio( http.server, { destroyUpgrade: false } );
	middleware = http.getAuthMiddleware();
	io.engine.allowRequest = authSocketIO;
	io.on( 'connection', acceptSocket );
}

function handle( topic, callback ) {
	_.each( registry.clients, function( client ) {
		if ( client.type === 'socketio' ) {
			client.on( topic, function( data ) {
				callback( data, client );
			} );
		}
	} );
}

function stop() {
	io.engine.removeAllListeners();
	io.engine.close();
}

module.exports = function( cfg, reg, auth ) {
	config = cfg;
	authStrategy = auth;
	registry = reg;
	return {
		config: configureSocketIO,
		on: handle,
		stop: stop
	};
};
