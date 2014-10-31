var path = require( 'path' );
var _ = require( 'lodash' );
var debug = require( 'debug' )( 'autohost:http-adapter' );
var HttpEnvelope;
var http;
var config;
var metrics;
var authStrategy;

var wrapper = {
	action: wireupAction,
	resource: wireupResource,
	start: start,
	stop: stop
};

function buildActionUrl( resourceName, action ) {
	var resourceIndex = action.url.indexOf( resourceName );
	var resource = resourceIndex === 0 || resourceIndex === 1 ? '' : resourceName;
	return http.buildUrl( ( config.apiPrefix || 'api' ), resource, ( action.url || '' ) );
}

function buildActionAlias( resourceName, actionName ) {
	return [ resourceName, actionName ].join( '.' );
}

function buildPath( pathSpec ) {
	var hasLocalPrefix;
	pathSpec = pathSpec || '';
	if( _.isArray( pathSpec ) ) {
		hasLocalPrefix = pathSpec[0].match( /^[.]\// );
		pathSpec = path.join.apply( {}, pathSpec );
	}
	pathSpec = pathSpec.replace( /^~/, process.env.HOME );
	return hasLocalPrefix ? './' + pathSpec : pathSpec;
}

function checkPermissionFor( user, action ) {
	debug( 'Checking %s\'s permissions for %s', ( user ? user.name : 'nouser' ), action );
	return authStrategy.checkPermission( user, action )
		.then( null, function( err ) {
			debug( 'Error during check permissions: %s', err.stack );
			return false;
		} )
		.then( function( granted ) {
			return granted;
		} );
}

function start() {
	http.start( authStrategy );
}

function stop() {
	http.stop();
}

function wireupResource( resource, basePath ) {
	var meta = { routes: {} };
	if( resource.resources && resource.resources !== '' ) {
		var directory = buildPath( [ basePath, resource.resources ] );
		http.static( '/' + resource.name, directory );
		meta.path = { url: '/' + resource.name, directory: directory };
	}
	_.each( resource.actions, function( action, actionName ) {
		wireupAction( resource, actionName, action, meta );
	} );
	return meta;
}

function wireupAction( resource, actionName, action, meta ) {
	var url = buildActionUrl( resource.name, action );
	var alias = buildActionAlias( resource.name, actionName );
	meta.routes[ actionName ] = { method: action.method, url: url };
	debug( 'Mapping resource \'%s\' action \'%s\' to %s %s', resource.name, actionName, action.method, url );
	http.route( url, action.method, function( req, res ) {
		req._resource = resource.name;
		req._action = actionName;
		req._checkPermission = authStrategy ? checkPermissionFor.bind( undefined, req.user ) : undefined;
		var respond = function() {
			var envelope = new HttpEnvelope( req, res );
			action.handle.apply( resource, [ envelope ] );
		};
		if( authStrategy ) {
			checkPermissionFor( req.user, alias )
				.then( function( pass ) {
					if( pass ) {
						debug( 'HTTP activation of action %s (%s %s) for %s granted', alias, action.method, url, req.user.name );
						respond();
					} else {
						debug( 'User %s was denied HTTP activation of action %s (%s %s)', req.user.name, alias, action.method, url );
						res.status( 403 ).send( "User lacks sufficient permissions" );
					}
				} );
		} else {
			respond();
		}
	} );
}

module.exports = function( cfg, auth, httpLib, req, meter ) {
	config = cfg;
	authStrategy = auth;
	http = httpLib;
	metrics = meter;
	HttpEnvelope = require( './httpEnvelope.js' )( req );
	return wrapper;
};