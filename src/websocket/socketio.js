var _ = require( 'lodash' );
var socketio = require( 'socket.io' );
var log = require( '../log' )( 'autohost.socketio' );

function acceptSocket( state, socket ) {
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
	if ( state.authProvider ) {
		state.authProvider.getSocketRoles( socket.user )
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
		log.debug( 'Closing socket.io client (user: %j)', socket.user );
		socket.removeAllListeners();
		socket.disconnect( true );
		state.registry.remove( socket );
	};

	// add a way to end session
	socket.logout = function() {
		request.logout();
		socket.close();
	};

	// if client identifies itself, register id
	socket.on( 'client.identity', function( data ) {
		log.debug( 'Client sent identity %j', data );
		socket.id = data.id;
		state.registry.identified( data.id, socket );
	} );

	// add anonymous socket
	state.registry.add( socket );

	// subscribe to registered topics
	_.each( state.registry.topics, function( callback, topic ) {
		if ( callback ) {
			socket.on( topic, function( data ) {
				callback( data, socket );
			} );
		}
	} );

	socket.publish( 'server.connected', { user: socket.user } );
	socket.on( 'disconnect', function() {
		log.debug( 'socket.io client disconnected (user: %j)', socket.user );
		socket.removeAllListeners();
		state.registry.remove( socket );
	} );
}

function authSocketIO( state, auth, req, allow ) {
	if ( state.authProvider ) {
		auth
			.handle( req, req.res, function( err ) {
				if ( err ) {
					log.debug( 'Error in authenticating socket.io connection %s', err.stack );
					allow( err );
				} else {
					log.debug( 'Authenticated socket.io connection as user %j', req.user );
					allow( null, req.user );
				}
			} );
	} else {
		allow( null, { id: 'anonymous', name: 'anonymous', roles: [] } );
	}
}

function configureSocketIO( state, http ) {
	var io = state.io = socketio( http.server, { destroyUpgrade: false } );
	var authStack = http.getAuthMiddleware()
		.use( '/', function( hreq, hres, next ) {
			log.debug( 'Setting socket.io connection user to %j', hreq.user );
			next();
		} );
	io.on( 'connection', acceptSocket.bind( undefined, state ) );
	io.engine.allowRequest = authSocketIO.bind( undefined, state, authStack );
}

function handle( state, topic, callback ) {
	_.each( state.registry.clients, function( client ) {
		if ( client.type === 'socketio' ) {
			client.on( topic, function( data ) {
				callback( data, client );
			} );
		}
	} );
}

function stop( state ) {
	state.io.engine.removeAllListeners();
	state.io.engine.close();
}

module.exports = function( config, registry, authProvider ) {
	var state = {
		authProvider: authProvider,
		config: config,
		registry: registry
	};
	_.merge( state, {
		configure: configureSocketIO.bind( undefined, state ),
		on: handle.bind( undefined, state ),
		stop: stop.bind( undefined, state )
	} );
	return state;
};
