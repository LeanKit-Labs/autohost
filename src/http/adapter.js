var path = require( 'path' );
var _ = require( 'lodash' );
var regex = require( './regex.js' );
var log = require( '../log' )( 'autohost.http.adapter' );
var passportFn = require( './passport.js' );
var metronic = require( '../metrics' );
var metrics;
var HttpEnvelope;
var http;
var config;
var authStrategy;
var passport;

var wrapper = {
	name: 'http',
	action: wireupAction,
	resource: wireupResource,
	start: start,
	stop: stop
};

function buildActionUrl( resourceName, actionName, action, resource, resources ) {
	var prefix;
	if ( resource.apiPrefix !== undefined ) {
		// Use the resource specific override
		prefix = resource.apiPrefix;
	} else {
		// If the resource doesn't have an override, use the config or default
		prefix = config.apiPrefix === undefined ? 'api' : config.apiPrefix;
	}

	if ( _.isRegExp( action.url ) ) {
		return regex.prefix( http.buildUrl( config.urlPrefix || '', prefix ), action.url );
	} else if ( config.urlStrategy ) {
		var url = config.urlStrategy( resourceName, actionName, action, resources );
		prefix = hasPrefix( url ) ? '' : prefix;
		return http.buildUrl( prefix, url );
	} else {
		var resourceIndex = action.url.indexOf( resourceName );
		var resourcePrefix = resourceIndex === 0 || resourceIndex === 1 ? '' : resourceName;
		return http.buildUrl( prefix, resource.urlPrefix || '', resourcePrefix, ( action.url || '' ) );
	}
}

function buildActionAlias( resourceName, actionName ) {
	return [ resourceName, actionName ].join( '.' );
}

function buildPath( pathSpec ) {
	var hasLocalPrefix;
	pathSpec = pathSpec || '';
	if ( _.isArray( pathSpec ) ) {
		hasLocalPrefix = pathSpec[ 0 ].match( /^[.]\// );
		pathSpec = path.join.apply( {}, pathSpec );
	}
	pathSpec = pathSpec.replace( /^~/, process.env.HOME );
	return hasLocalPrefix ? './' + pathSpec : pathSpec;
}

function checkPermissionFor( user, context, action ) {
	log.debug( 'Checking %s\'s permissions for %s', getUserString( user ), action );
	metrics.authorizationAttempts.record();
	var timer = metrics.authorizationTimer();
	return authStrategy.checkPermission( user, action, context )
		.then( null, function( err ) {
			log.error( 'Error during check permissions: %s', err.stack );
			metrics.authorizationErrors.record();
			timer.record();
			return false;
		} )
		.then( function( granted ) {
			timer.record();
			return granted;
		} );
}

function getUserString( user ) {
	return user.name ? user.name : JSON.stringify( user );
}

function hasPrefix( url ) {
	var prefix = http.buildUrl( config.urlPrefix || '', config.apiPrefix || '' );
	return url.indexOf( prefix ) === 0;
}

function start() {
	http.start( config, passport );
}

function stop() {
	http.stop();
}

function wireupResource( resource, basePath, resources ) {
	var meta = { routes: {} };
	var static = resource.static || resource.resources;
	if ( static ) {
		static = typeof static === 'string' ? { path: static } : static;
		static.path = buildPath( [ basePath, static.path ] );
		http.static( '/' + resource.name, static );
		meta.path = { url: '/' + resource.name, directory: static.path };
	}
	_.each( resource.actions, function( action, actionName ) {
		wireupAction( resource, actionName, action, meta, resources );
	} );
	return meta;
}

function wireupAction( resource, actionName, action, meta, resources ) {
	var url = buildActionUrl( resource.name, actionName, action, resource, resources );
	var alias = buildActionAlias( resource.name, actionName );
	var resourceKey = [ [ resource.name, actionName ].join( '-' ), 'http' ];
	var metricKey = [ metrics.prefix ].concat( resourceKey );
	var errors = metrics.meter( resourceKey.concat( 'error' ) );
	meta.routes[ actionName ] = { method: action.method, url: url };
	log.debug( 'Mapping resource \'%s\' action \'%s\' to %s %s', resource.name, actionName, action.method, url );

	http.route( url, action.method, function( req, res ) {
		req._metricKey = metricKey;
		req._resource = resource.name;
		req._action = actionName;
		req._checkPermission = authStrategy ? checkPermissionFor.bind( undefined, req.user, req.context ) : undefined;
		var timer = metrics.timer( resourceKey.concat( 'duration' ) );
		res.once( 'finish', function() {
			timer.record();
		} );
		var respond = function() {
			var envelope = new HttpEnvelope( req, res, metricKey );
			if ( config && config.handleRouteErrors ) {
				try {
					action.handle.apply( resource, [ envelope ] );
				} catch ( err ) {
					errors.record();
					log.debug( 'ERROR! route: %s %s failed with %s', action.method.toUpperCase(), action.url, err.stack );
					res.status( 500 ).send( 'Server error at ' + action.method.toUpperCase() + ' ' + action.url );
				}
			} else {
				action.handle.apply( resource, [ envelope ] );
			}
		};
		if ( authStrategy ) {
			metrics.authorizationAttempts.record();
			checkPermissionFor( req.user, req.context, alias )
				.then( function onPermission( pass ) {
					if ( pass ) {
						metrics.authorizationGrants.record();
						log.debug( 'HTTP activation of action %s (%s %s) for %s granted', alias, action.method, url, getUserString( req.user ) );
						respond();
					} else {
						metrics.authorizationRejections.record();
						log.debug( 'User %s was denied HTTP activation of action %s (%s %s)', getUserString( req.user ), alias, action.method, url );
						if ( !res._headerSent ) {
							res.status( 403 ).send( 'User lacks sufficient permissions' );
						}
					}
				} );
		} else {
			respond();
		}
	} );
}

module.exports = function( cfg, auth, httpLib, req ) {
	config = cfg;
	metrics = metronic( cfg );
	authStrategy = auth;
	if ( auth ) {
		passport = passportFn( cfg, auth );
		wrapper.passport = passport;
	}
	http = httpLib;
	HttpEnvelope = require( './httpEnvelope.js' )( req );
	return wrapper;
};
