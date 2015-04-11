var _ = require( 'lodash' );
var when = require( 'when' );
var passport = require( 'passport' );
var log = require( '../log' )( 'autohost.passport' );
var metronic = require( '../metrics' );
var noOp = function() {
	return when( true );
};
var userCountCheck = noOp;
var passportInitialize;
var passportSession;
var authProvider;
var anonPaths;
var metrics;

reset();

function authConditionally( req, res, next ) {
	// if previous middleware has said to skip auth OR
	// a user was attached from a session, skip authenticating
	if ( req.skipAuth || req.user ) {
		metrics.authenticationSkips.record();
		next();
	} else {
		metrics.authenticationAttempts.record();
		var timer = metrics.authenticationTimer();
		authProvider.authenticate( req, res, next );
		timer.record();
	}
}

function getAuthMiddleware( uri ) {
	var list = [
		{ path: uri, fn: passportInitialize },
		{ path: uri, fn: passportSession }
	]
		.concat( _.map( anonPaths, function( pattern ) {
			return { path: pattern, fn: skipAuthentication };
		} ) )
		.concat( [ { path: uri, fn: whenNoUsers },
			{ path: uri, fn: authConditionally },
		{ path: uri, fn: getRoles } ] );
	return list;
}

function getRoles( req, res, next ) {
	var userName = _.isObject( req.user.name ) ? req.user.name.name : req.user.name;
	req.authenticatedUser = userName || req.user.id || 'anonymous';
	if ( userName === 'anonymous' ) {
		req.user.roles = [ 'anonymous' ];
		next();
	} else {
		var timer = metrics.authorizationTimer();
		authProvider.getUserRoles( req.user, req.context )
			.then( null, function( err ) {
				metrics.authorizationErrors.record();
				timer.record();
				log.debug( 'Failed to get roles for %s with %s', getUserString( req.user ), err.stack );
				// during a socket connection, express is not fully initialized and this call fails ... hard
				try {
					res.status( 500 ).send( 'Could not determine user permissions' );
				} catch ( err ) {
					return [];
				}
			} )
			.then( function( roles ) {
				log.debug( 'Got roles [ %s ] for %s', roles, req.user );
				req.user.roles = roles;
				timer.record();
				next();
			} );
	}
}

function getSocketRoles( user ) {
	if ( user.name === 'anonymous' ) {
		return when( [ 'anonymous' ] );
	} else {
		var timer = metrics.authorizationTimer();
		return authProvider.getUserRoles( user, {} )
			.then( null, function( err ) {
				metrics.authorizationErrors.record();
				timer.record();
				log.debug( 'Failed to get roles for %s with %s', getUserString( user ), err.stack );
				return [];
			} )
			.then( function( roles ) {
				log.debug( 'Got roles [ %s ] for %s', roles, getUserString( user ) );
				timer.record();
				return roles;
			} );
	}
}

function getUserString( user ) {
	return user.name ? user.name : JSON.stringify( user );
}

function reset() {
	passportInitialize = passport.initialize();
	passportSession = passport.session();
	authProvider = undefined;
	anonPaths = undefined;
}

function resetUserCount() {
	userCountCheck = authProvider.hasUsers;
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
	userCountCheck = authProvider.hasUsers || userCountCheck;
	_.each( authProvider.strategies, function( strategy ) {
		passport.use( strategy );
	} );
}

module.exports = function( config, authPlugin, resetState ) {
	if ( resetState ) {
		reset();
	}
	metrics = metronic();
	authProvider = authPlugin;
	authProvider.initPassport( passport );
	passport.serializeUser( authProvider.serializeUser );
	passport.deserializeUser( authProvider.deserializeUser );
	if ( config.anonymous ) {
		anonPaths = _.isArray( config.anonymous ) ? config.anonymous : [ config.anonymous ];
	} else {
		anonPaths = [];
	}
	withAuthLib( authProvider );
	return {
		getMiddleware: getAuthMiddleware,
		getSocketRoles: getSocketRoles,
		hasUsers: userCountCheck,
		resetUserCheck: resetUserCount
	};
};
