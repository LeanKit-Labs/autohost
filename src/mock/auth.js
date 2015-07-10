// this mock is intended to support tests as well as provide a memory-based implementation
// example for the full authProvider spec for autohost
var Basic = require( 'passport-http' ).BasicStrategy;
var Bearer = require( 'passport-http-bearer' ).Strategy;
var Query = require( './queryStrategy.js' );
var log = require( '../log' )( 'autohost.auth.mock' );
var _ = require( 'lodash' );
var bearerAuth;
var basicAuth;
var queryAuth;
var useSession = true;
var wrapper = {};

function authenticate( req, res, next ) {
	var authorization = req.headers.authorization;
	if ( /Basic/i.test( authorization ) ) {
		basicAuth( req, res, next );
	} else if ( req._query && req._query[ 'token' ] ) {
		queryAuth( req, res, next );
	} else {
		bearerAuth( req, res, next );
	}
}

function authenticateCredentials( userName, password, done ) {
	var user = _.where( wrapper.users, function( o, u ) {
		return u === userName && o.password === password;
	} );
	log.debug( 'credentials %s:%s resulted in', userName, password, user, 'amongst', _.keys( wrapper.users ) );
	done( null, ( user.length ? user[ 0 ] : user ) || false );
}

function authenticateToken( token, done ) {
	var userName = wrapper.tokens[ token ],
		user = userName ? wrapper.users[ userName ] : false;
	log.debug( 'bearer token %s resulted in', token, user, 'amongst', _.keys( wrapper.users ) );
	done( null, user );
}

function authenticateQuery( token, done ) {
	var userName = wrapper.tokens[ token ];
	var user = userName ? wrapper.users[ userName ] : false;
	log.debug( 'query token %s resulted in', token, user, 'amongst', _.keys( wrapper.users ) );
	done( null, user );
}

function checkPermission( user, action, context ) {
	if ( /noperm/.test( user.name ? user.name : user ) ) {
		return when.reject( new Error( 'Failing for failure' ) );
	}
	log.debug( 'checking user %s for action %s', getUserString( user ), action );
	return when.try( hasPermissions, getUserRoles( user ), getActionRoles( action ), context );
}

function getUserString( user ) {
	return user.name || user.username || user.id || JSON.stringify( user );
}

function hasPermissions( userRoles, actionRoles, context ) {
	if ( context.noSoupForYou ) {
		return false;
	} else {
		return _.isEmpty( actionRoles ) ||
			( _.intersection( userRoles, actionRoles ).length > 0 );
	}
}

function getActionRoles( action ) {
	return when.promise( function( resolve ) {
		resolve( wrapper.actions[ action ] && wrapper.actions[ action ].roles || [] );
	} );
}

function getUserRoles( user ) {
	if ( /error/.test( user.name ? user.name : user ) ) {
		return when.reject( new Error( 'Failing for failure' ) );
	}
	var userName = user.name ? user.name : user;
	return when.promise( function( resolve ) {
		var tmp = wrapper.users[ userName ];
		log.debug( 'Getting user roles for %s: %s', getUserString( user ), JSON.stringify( tmp ) );
		resolve( tmp ? tmp.roles : [] );
	} );
}

function hasUsers() {
	return when.promise( function( resolve ) {
		resolve( _.keys( wrapper.users ).length > 0 );
	} );
}

function serializeUser( user, done ) {
	done( null, JSON.stringify( user ) );
}

function deserializeUser( user, done ) {
	try {
		done( null, _.isObject( user ) ? user : JSON.parse( user ) );
	} catch ( e ) {
		done( e, null );
	}
}

function reset() {
	wrapper = {
		authenticate: authenticate,
		checkPermission: checkPermission,
		getUserRoles: getUserRoles,
		hasUsers: hasUsers,
		serializeUser: serializeUser,
		deserializeUser: deserializeUser,
		strategies: [
			new Basic( authenticateCredentials ),
			new Bearer( authenticateToken ),
			new Query( authenticateQuery )
		],
		initPassport: function( passport ) {
			basicAuth = passport.authenticate( 'basic', { session: useSession } );
			bearerAuth = passport.authenticate( 'bearer', { session: useSession } );
			queryAuth = passport.authenticate( 'query', { session: useSession } );
		},
		users: {},
		actions: {},
		roles: {},
		tokens: {}
	};
}

module.exports = function() {
	// useSession = !config.noSession;
	reset();
	return wrapper;
};
