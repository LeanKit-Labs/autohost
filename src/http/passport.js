var _ = require( 'lodash' );
var when = require( 'when' );
var passport = require( 'passport' );
var log = require( '../log' )( 'autohost.passport' );
var metronic = require( '../metrics' );
var noOp = function() {
	return when( true );
};
var userCountCheck = noOp;

function authConditionally( state, req, res, next ) {
	// if previous middleware has said to skip auth OR
	// a user was attached from a session, skip authenticating
	if ( req.skipAuth || req.user ) {
		state.metrics.authenticationSkips.record();
		next();
	} else {
		state.metrics.authenticationAttempts.record();
		var timer = state.metrics.authenticationTimer();
		state.authProvider.authenticate( req, res, next );
		timer.record();
	}
}

function getAuthMiddleware( state, uri ) {
	var list = [
		{ path: uri, fn: state.passportInitialize },
		{ path: uri, fn: state.passportSession }
	]
		.concat( _.map( state.anonPaths, function( pattern ) {
			return { path: pattern, fn: skipAuthentication };
		} ) )
		.concat( [ { path: uri, fn: whenNoUsers },
			{ path: uri, fn: authConditionally.bind( undefined, state ) },
		{ path: uri, fn: getRoles } ] );
	return list;
}

function getRoles( state, req, res, next ) {
	var userName = _.isObject( req.user.name ) ? req.user.name.name : req.user.name;
	req.authenticatedUser = userName || req.user.id || 'anonymous';

	function onError( err ) {
		state.metrics.authorizationErrors.record();
		req.user.roles = [];
		timer.record();
		log.debug( 'Failed to get roles for %s with %s', getUserString( req.user ), err.stack );
		// during a socket connection, express is not fully initialized and this call fails ... hard
		try {
			res.status( 500 ).send( 'Could not determine user permissions' );
		} catch ( err ) {
			log.warn( 'Could not reply with user permission error to request before express is fully initialized.' );
		}
		next();
	}

	function onRoles( roles ) {
		log.debug( 'Got roles [ %s ] for %s', roles, req.user );
		req.user.roles = roles;
		timer.record();
		next();
	}

	if ( userName === 'anonymous' ) {
		req.user.roles = [ 'anonymous' ];
		next();
	} else {
		var timer = state.metrics.authorizationTimer();
		state.authProvider.getUserRoles( req.user, req.context )
			.then( onRoles, onError );
	}
}

function getSocketRoles( state, user ) {
	function onError( err ) {
		state.metrics.authorizationErrors.record();
		timer.record();
		log.debug( 'Failed to get roles for %s with %s', getUserString( user ), err.stack );
		return [];
	}

	function onRoles( roles ) {
		log.debug( 'Got roles [ %s ] for %s', roles, getUserString( user ) );
		timer.record();
		return roles;
	}

	if ( user.name === 'anonymous' ) {
		return when( [ 'anonymous' ] );
	} else {
		var timer = state.metrics.authorizationTimer();
		return state.authProvider.getUserRoles( user, {} )
			.then( onRoles, onError );
	}
}

function getUserString( user ) {
	return user.name ? user.name : JSON.stringify( user );
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
		authProvider: authProvider,
		metrics: metronic(),
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
