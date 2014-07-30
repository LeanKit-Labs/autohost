var _ = require( 'lodash' ),
	socketio = require( 'socket.io' ),
	passportIo = require( 'passport.socketio' ),
	debug = require( 'debug' )( 'autohost:socketio' ),
	authStrategy,
	registry,
	config,
	io,
	middleware;

function acceptSocket( socket ) {
	var handshake = socket.handshake;

	// grab user from request
	socket.user = {
		id: handshake.id || handshake.user || 'anonymous',
		name: handshake.user || 'anonymous' 
	};
	
	// copy cookies from request from middleware
	socket.cookies = {};
	if( handshake.headers.cookie ) {
		_.each( handshake.headers.cookie.split( ';' ), function( cookie ) {
			var crumbs = cookie.split( '=' );
			socket.cookies[ crumbs[ 0 ].trim() ] = crumbs[ 1 ].trim();
		} );
	}

	// attach roles to user on socket
	if( authStrategy ) {
		authStrategy.getSocketRoles( socket.user.name )
			.then( function( roles ) {
				socket.user.roles = roles;
			} );
	}

	// normalize socket publishing interface
	socket.publish = function( topic, message ) {
		socket.emit( topic, message );
	};

	// add a way to close a socket
	socket.close = function() {
		socket.removeAllListeners();
		socket.disconnect( true );
		registry.remove( socket ); 
	};

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
			socket.on( topic, function( data ) {
				callback( data, socket ); 
			} );
		}
	} );

	socket.publish( 'server.connected', { user: socket.user } );
	socket.on( 'disconnect', function() { 
		socket.removeAllListeners();
		registry.remove( socket ); 
	} );
}

function authSocketIO( req, allow ) {
	var allowed;
	middleware
		.use( '/', function( hreq, hres, next ) {
			allowed = hreq.user;
			next();
		} )
		.handle( req, req.res, function( err ) {
			if( err ) {
				allow( err );
			} else {
				allow( null, allowed );
			}
		} );
}

function configureSocketIO( http ) {
	io = socketio( http.server );
	middleware = http.getAuthMiddleware();
	io.engine.allowRequest = authSocketIO;
	io.on( 'connection', acceptSocket );
}

function handle( topic, callback ) {
	_.each( registry.clients, function( client ) {
		client.on( topic, function( data ) { callback( data, client ); } );
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
	}
};