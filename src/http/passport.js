var _ = require( 'lodash' );
var when = require( 'when' );
var passport = require( 'passport' );
var log = require( '../log' )( 'autohost.passport' );
var noOp = function() {
	return when( true );
};
var userCountCheck = noOp;

function authConditionally( state, req, res, next ) {
	// if previous middleware has said to skip auth OR
	// a user was attached from a session, skip authenticating
	var isOptions = req.method.toLowerCase() === "options";
	var skipAuth = req.skipAuth || ( isOptions && !state.config.authOptions );
	if ( skipAuth || req.user ) {
		skipAuthentication( req, res, next );
	} else {
		state.authProvider.authenticate( req, res, next );
	}
}

function getAuthMiddleware( state, uri ) {
	const list = [
		{ path: uri, fn: state.passportInitialize, alias: "passport" }
	];

	if ( !state.config.noSession ) {
		list.push( { path: uri, fn: state.passportSession, alias: "passportSession" } );
	}

	return list.concat( _.map( state.anonPaths, function ( pattern ) {
		return { path: pattern, fn: skipAuthentication, alias: "skipAuth" };
	} ) )
		.concat( [ { path: uri, fn: whenNoUsers },
			{ path: uri, fn: authConditionally.bind( undefined, state ), alias: "conditionalAuth" },
			{ path: uri, fn: getRoles.bind( undefined, state ), alias: "userRoles" } ] );
}

function getRoles( state, req, res, next ) {
	var userName = _.isObject( req.user ) ? req.user.name : undefined;

	function onError( err ) {
		req.user.roles = [];
		log.debug( 'Failed to get roles for %s with %s', state.config.getUserString( req.user ), err.stack );
		// during a socket connection, express is not fully initialized and this call fails ... hard
		if( state.config.socketio && /socket.io/.test( req.url ) ) {
			next();
		} else if ( state.config.websocket && /websocket/.test( req.url ) ) {
			next();
		} else {
			try {
				res.status( 500 ).send( { message: 'Could not determine user permissions' } );
			} catch ( err ) {
				log.warn( 'Could not reply with user permission error to request before express is fully initialized.' );
			}
		}
	}

	function onRoles( roles ) {
		log.debug( 'Got roles [ %s ] for %s', roles, req.user );
		req.user.roles = roles;
		next();
	}

	if ( userName === 'anonymous' ) {
		req.user.roles = [ 'anonymous' ];
		next();
	} else {
		state.authProvider.getUserRoles( req.user, req.context )
			.then( onRoles, onError );
	}
}

function getSocketRoles( state, user ) {
	function onError( err ) {
		log.debug( 'Failed to get roles for %s with %s', state.config.getUserString( user ), err.stack );
		return [];
	}

	function onRoles( roles ) {
		log.debug( 'Got roles [ %s ] for %s', roles, state.config.getUserString( user ) );
		return roles;
	}

	if ( user.name === 'anonymous' ) {
		return when( [ 'anonymous' ] );
	} else {
		return state.authProvider.getUserRoles( user, {} )
			.then( onRoles, onError );
	}
}

function resetUserCount( state ) {
	userCountCheck = state.authProvider.hasUsers;
}

function skipAuthentication( req, res, next ) {
	req.skipAuth = true;
	if ( !req.user ) {
		log.debug( 'Skipping authentication and assigning user anonymous to request %s %s', req.method, req.url );
		req.user = {
			id: 'anonymous',
			name: 'anonymous',
			roles: []
		};
	}
	next();
}

function whenNoUsers( req, res, next ) {
	userCountCheck()
		.then( function( hasUsers ) {
			if ( hasUsers ) {
				userCountCheck = noOp;
				next();
			} else {
				skipAuthentication( req, res, next );
			}
		} );
}

function withAuthLib( authProvider ) {
	authProvider.initPassport( passport );
	passport.serializeUser( authProvider.serializeUser );
	passport.deserializeUser( authProvider.deserializeUser );
	userCountCheck = authProvider.hasUsers || userCountCheck;
	_.each( authProvider.strategies, function( strategy ) {
		passport.use( strategy );
	} );
}

module.exports = function( config, authProvider ) {
	var state = {
		config: config,
		authProvider: authProvider,
		passportInitialize: passport.initialize(),
		passportSession: passport.session()
	};
	_.merge( state, {
		getMiddleware: getAuthMiddleware.bind( undefined, state ),
		getRoles: getRoles.bind( undefined, state ),
		getSocketRoles: getSocketRoles.bind( undefined, state ),
		hasUsers: userCountCheck.bind( undefined, state ),
		resetUserCheck: resetUserCount.bind( undefined, state )
	} );
	if ( config.anonymous ) {
		state.anonPaths = _.isArray( config.anonymous ) ? config.anonymous : [ config.anonymous ];
	} else {
		state.anonPaths = [];
	}
	withAuthLib( authProvider );
	return state;
};
