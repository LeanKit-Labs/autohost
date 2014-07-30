var _ = require( 'lodash' ),
	when = require( 'when' ),
	passport = require( 'passport' ),
	debug = require( 'debug' )( 'autohost:passport' ),
	noOp = function() { return when( true ); },
	serializer = function( user, done ) { done( null, user ); },
	deserializer = function( user, done ) { done( null, user ); },
	userCountCheck = noOp,
	unauthCount = 'autohost.unauthorized.count',
	unauthRate = 'autohost.unauthorized.rate',
	authorizationErrorCount = 'autohost.authorization.errors',
	authorizationErrorRate = 'autohost.authorization.error.rate',
	authenticationTimer = 'autohost.authentication.timer',
	authorizationTimer = 'autohost.authorization.timer',
	passportInitialize = passport.initialize(),
	passportSession = passport.session(),
	authenticationStrategy,
	authenticationStrategyProperties,
	authProvider,
	anonPaths,
	metrics;

function addPassport( http ) {
	http.middleware( '/', passportInitialize );
	http.middleware( '/', passportSession );
	
	_.each( anonPaths, function( pattern ) {
		http.middleware( pattern, skipAuthentication );
	} );
	
	http.middleware( '/', whenNoUsers );
	http.middleware( '/', authConditionally );
	http.middleware( '/', getRoles );

	passport.serializeUser( authProvider.serializeUser );
	passport.deserializeUser( authProvider.deserializeUser );
	debug( 'passport configured' );
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

function checkPermission( user, action ) {
	return authenticator.checkPermission( user, action );
}

function getRoles( req, res, next ) {
	metrics.timer( authorizationTimer ).start();
	var userName = _.isObject( req.user.name ) ? req.user.name.name : req.user.name;
	authProvider.getUserRoles( req.user.name )
		.then( null, function( err ) {
			metrics.counter( authorizationErrorCount ).incr();
			metrics.meter( authorizationErrorRate ).record();
			metrics.timer( authorizationTimer ).record();
			debug( 'Failed to get roles for %s with %s', userName, err.stack );
			res.status( 500 ).send( 'Could not determine user permissions' );
		} )
		.then( function( roles ) {
			debug( 'Got roles [ %s ] for %s', roles, req.user.name );
			req.user.roles = roles;
			metrics.timer( authorizationTimer ).record();
			next();
		} );
}

function getSocketRoles( userName ) {
	if( typeof userName == 'object' ) {
		console.trace( userName );
	}
	metrics.timer( authorizationTimer ).start();
	return authProvider.getUserRoles( userName )
		.then( null, function( err ) {
			metrics.counter( authorizationErrorCount ).incr();
			metrics.meter( authorizationErrorRate ).record();
			metrics.timer( authorizationTimer ).record();
			debug( 'Failed to get roles for %s with %s', userName, err.stack );
			return [];
		} )
		.then( function( roles ) {
			debug( 'Got roles [ %s ] for %s', roles, userName );
			metrics.timer( authorizationTimer ).record();
			return roles;
		} );
}

function resetUserCount() {
	userCountCheck = authProvider.hasUsers;
}

function skipAuthentication( req, res, next ) {
	req.skipAuth = true;
	req.user = {
		id: 'anonymous',
		name: 'anonymous',
		roles: []
	}
	debug( 'Skipping authentication and assigning user anonymous to request %s %s', req.method, req.url );
	next();
}

function authConditionally( req, res, next ) {
	if( req.skipAuth ) {
		next();
	} else {
		metrics.timer( authenticationTimer ).start();
		authProvider.authenticate( req, res, next );
		metrics.timer( authenticationTimer ).record();
	}
}

function whenNoUsers( req, res, next ) {
	userCountCheck()
		.then( function( hasUsers ) {
			if( hasUsers ) {
				userCountCheck = noOp;
				next();
			} else {
				skipAuthentication( req, res, next );
			}
		} );
}

function withAuthLib( authProvider ) {
	serializeUser = authProvider.serializeUser || serializeUser;
	deserializeUser = authProvider.deserializeUser || deserializeUser;
	userCountCheck = authProvider.hasUsers || userCountCheck;
	_.each( authProvider.strategies, function( strategy ) {
		passport.use( strategy );
	} );
}

module.exports = function( config, authPlugin, meter ) {
	metrics = meter;
	authProvider = authPlugin;
	if( config.anonymous ) {
		anonPaths = _.isArray( config.anonymous ) ? config.anonymous : [ config.anonymous ];
	} else {
		anonPaths = [];
	}
	withAuthLib( authProvider );
	return {
		getMiddleware: getAuthMiddleware,
		getSocketRoles: getSocketRoles,
		hasUsers: userCountCheck,
		resetUserCheck: resetUserCount,
		wireupPassport: addPassport
	};
};