// this mock is intended to support tests as well as provide a memory-based implementation
// example for the full authProvider spec for autohost

var _ = require( 'lodash' ),
	when = require( 'when' ),
	passport = require( 'passport' ),
	Basic = require( 'passport-http' ).BasicStrategy,
	Bearer = require( 'passport-http-bearer' ).Strategy,
	Query = require( './queryStrategy.js' ),
	debug = require( 'debug' )( 'autohost:auth.mock' ),
	bearerAuth,
	basicAuth,
	queryAuth,
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
		users: {},
		actions: {},
		roles: {},
		tokens: {}
	};

function authenticate( req, res, next ) {
	var authorization = req.headers.authorization;
	if( /Basic/i.test( authorization ) ) {
		basicAuth( req, res, next );
	}
	else if( req._query && req._query[ 'token' ] ) {
		queryAuth( req, res, next );
	} else {
		bearerAuth( req, res, next );
	}
}

function authenticateCredentials( userName, password, done ) {
	var user = _.where( wrapper.users, function( o, u ) {
		return u === userName && o.password === password;
	} );
	debug( 'credentials %s:%s resulted in', userName, password, user ,'amongst', _.keys( wrapper.users ) );
	done( null, ( user.length ? user[ 0 ] : user ) || false );
}

function authenticateToken( token, done ) {
	var userName = wrapper.tokens[ token ],
		user = userName ? wrapper.users[ userName ] : false;
	debug( 'bearer token %s resulted in', token, user ,'amongst', _.keys( wrapper.users ) );
	done( null, user );
}

function authenticateQuery( token, done ) {
	var userName = wrapper.tokens[ token ],
		user = userName ? wrapper.users[ userName ] : false;
	debug( 'query token %s resulted in', token, user ,'amongst', _.keys( wrapper.users ) );
	done( null, user );
}

function checkPermission( user, action ) {
	var userName = user.name ? user.name : user,
		userRoles = user.roles ? user.roles : getUserRoles( userName );
	debug( 'checking user %s for action %s', userName, action );
	return when.try( hasPermissions, userRoles, getActionRoles( action ) );
}

function hasPermissions( userRoles, actionRoles ) {
	debug( 'user roles: %s, action roles: %s', userRoles, actionRoles );
	return _.isEmpty( actionRoles ) || 
		( _.intersection( userRoles, actionRoles ).length > 0 );
}

function getActionRoles( action ) {
	return when.promise( function( resolve ) {
		resolve( wrapper.actions[ action ].roles || [] );
	} );
}

function getUserRoles( user ) {
	return when.promise( function( resolve ) {
		var tmp = wrapper.users[ user ];
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

module.exports = function( config ) {
	var useSession = !config.noSession;
	basicAuth = passport.authenticate( 'basic', { session: useSession } );
	bearerAuth = passport.authenticate( 'bearer', { session: useSession } );
	queryAuth = passport.authenticate( 'query', { session: useSession } );
	return wrapper;
};