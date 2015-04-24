var path = require( 'path' );
var _ = require( 'lodash' );
var regex = require( './regex.js' );
var log = require( '../log' )( 'autohost.http.adapter' );
var passportFn = require( './passport.js' );
var metronic = require( '../metrics' );

function buildActionUrl( state, resourceName, actionName, action, resource, resources ) {
	var prefix;
	if ( resource.apiPrefix !== undefined ) {
		// Use the resource specific override
		prefix = resource.apiPrefix;
	} else {
		// If the resource doesn't have an override, use the config or default
		prefix = state.config.apiPrefix === undefined ? 'api' : state.config.apiPrefix;
	}

	if ( _.isRegExp( action.url ) ) {
		return regex.prefix(
			state.http.buildUrl( state.config.urlPrefix || '', prefix ),
			action.url
		);
	} else if ( state.config.urlStrategy ) {
		var url = state.config.urlStrategy( resourceName, actionName, action, resources );
		prefix = hasPrefix( url ) ? '' : prefix;
		return state.http.buildUrl( prefix, url );
	} else {
		var resourceIndex = action.url.indexOf( resourceName );
		var resourcePrefix = resourceIndex === 0 || resourceIndex === 1 ? '' : resourceName;
		return state.http.buildUrl(
			prefix, resource.urlPrefix || '', resourcePrefix, ( action.url || '' )
		);
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

function checkPermissionFor( state, user, context, action ) {
	log.debug( 'Checking %s\'s permissions for %s',
		getUserString( user ), action
	);
	state.metrics.authorizationAttempts.record();
	var timer = state.metrics.authorizationTimer();
	function onError( err ) {
		log.error( 'Error during check permissions: %s', err.stack );
		state.metrics.authorizationErrors.record();
		timer.record();
		return false;
	}
	function onPermission( granted ) {
		timer.record();
		return granted;
	}
	return state.auth.checkPermission( user, action, context )
		.then( onPermission, onError );
}

function getActionMetadata( state, resource, actionName, action, meta, resources ) {
	var url = buildActionUrl( state, resource.name, actionName, action, resource, resources );
	var alias = buildActionAlias( resource.name, actionName );
	var resourceKey = [ [ resource.name, actionName ].join( '-' ), 'http' ];
	var metricKey = [ state.metrics.prefix ].concat( resourceKey );
	var errors = state.metrics.meter( resourceKey.concat( 'error' ) );
	meta.routes[ actionName ] = { method: action.method, url: url };
	return {
		alias: alias,
		authAttempted: function() {
			state.metrics.authorizationAttempts.record();
		},
		authGranted: function() {
			state.metrics.authorizationGrants.record();
		},
		authRejected: function() {
			state.metrics.authorizationRejections.record();
		},
		errorCount: errors,
		getEnvelope: function( req, res ) {
			return new state.Envelope( req, res, metricKey );
		},
		getPermissionCheck: function( req ) {
			return state.auth ? checkPermissionFor.bind( undefined, state, req.user, req.context ) : undefined;
		},
		getTimer: function() {
			return state.metrics.timer( resourceKey.concat( 'duration' ) );
		},
		handleErrors: state.config && state.config.handleRouteErrors,
		metricKey: metricKey,
		resourceKey: resourceKey,
		url: url
	};
}

function getUserString( user ) {
	return user.name ? user.name : JSON.stringify( user );
}

function hasPrefix( state, url ) {
	var prefix = state.http.buildUrl(
		state.config.urlPrefix || '',
		state.config.apiPrefix || ''
	);
	return url.indexOf( prefix ) === 0;
}

function setupPassport( config, auth ) {
	if ( auth ) {
		return passportFn( config, auth );
	}
}

function start( state ) {
	state.http.start( state.config, state.passport );
}

function stop( state ) {
	state.http.stop();
}

function wireupResource( state, resource, basePath, resources ) {
	var meta = { routes: {} };
	var static = resource.static || resource.resources;
	if ( static ) {
		static = typeof static === 'string' ? { path: static } : static;
		static.path = buildPath( [ basePath, static.path ] );
		state.http.static( '/' + resource.name, static );
		meta.path = { url: '/' + resource.name, directory: static.path };
	}
	_.each( resource.actions, function( action, actionName ) {
		wireupAction( state, resource, actionName, action, meta, resources );
	} );
	return meta;
}

function wireupAction( state, resource, actionName, action, metadata, resources ) {
	var meta = getActionMetadata( state, resource, actionName, action, metadata, resources );
	log.debug( 'Mapping resource \'%s\' action \'%s\' to %s %s',
		resource.name, actionName, action.method, meta.url );

	state.http.route( meta.url, action.method, function( req, res ) {
		req._metricKey = meta.metricKey;
		req._resource = resource.name;
		req._action = actionName;
		req._checkPermission = meta.getPermissionCheck( req );
		var timer = meta.getTimer();
		res.once( 'finish', function() {
			timer.record();
		} );
		var respond = function() {
			var envelope = meta.getEnvelope( req, res );
			if ( meta.handleErrors ) {
				try {
					action.handle.apply( resource, [ envelope ] );
				} catch ( err ) {
					meta.errorCount.record();
					log.debug( 'ERROR! route: %s %s failed with %s',
						action.method.toUpperCase(), action.url, err.stack );
					res.status( 500 ).send(
						'Server error at ' + action.method.toUpperCase() + ' ' + action.url
					);
				}
			} else {
				action.handle.apply( resource, [ envelope ] );
			}
		};
		if ( state.auth ) {
			meta.authAttempted();
			checkPermissionFor( state, req.user, req.context, meta.alias )
				.then( function onPermission( pass ) {
					if ( pass ) {
						meta.authGranted();
						log.debug( 'HTTP activation of action %s (%s %s) for %s granted',
							meta.alias, action.method, meta.url, getUserString( req.user ) );
						respond();
					} else {
						meta.authRejected();
						log.debug( 'User %s was denied HTTP activation of action %s (%s %s)',
							getUserString( req.user ), meta.alias, action.method, meta.url );
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

module.exports = function( config, auth, http, req ) {
	var state = {};
	_.merge( state, {
		auth: auth,
		config: config,
		http: http,
		name: 'http',
		Envelope: require( './httpEnvelope.js' )( req ),
		action: wireupAction.bind( undefined, state ),
		metrics: metronic(),
		passport: setupPassport( config, auth ),
		resource: wireupResource.bind( undefined, state ),
		start: start.bind( undefined, state ),
		stop: stop.bind( undefined, state )
	} );
	return state;
};
