var path = require( 'path' );
var _ = require( 'lodash' );
var when = require( 'when' );
var regex = require( './regex.js' );
var log = require( '../log' )( 'autohost.http.adapter' );
var passportFn = require( './passport.js' );
var metronic = require( '../metrics' );
var format = require( 'util' ).format;

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
		prefix = hasPrefix( state, url ) ? '' : prefix;
		return state.http.buildUrl( prefix, url );
	} else {
		var resourceIndex = action.url ? action.url.indexOf( resourceName ) : -1;
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

function checkPermissionFor( state, permissionCheck, meta, action, envelope, next ) {
	log.debug( 'Checking %s\'s permissions for %s',
		state.config.getUserString( envelope.user ), meta.alias
	);
	meta.authAttempted();
	var timer = state.metrics.authorizationTimer();

	function onError( err ) {
		log.error( 'Error during check permissions: %s', err.stack );
		state.metrics.authorizationErrors.record( 1, { name: 'HTTP_AUTHORIZATION_ERRORS' });
		timer.record( { name: 'HTTP_AUTHORIZATION_DURATION' } );
		throw err;
	}

	function onPermission( granted ) {
		timer.record( { name: 'HTTP_AUTHORIZATION_DURATION' } );
		if( granted ) {
			meta.authGranted();
			log.debug( 'HTTP activation of action %s (%s %s) for %j granted',
				meta.alias, action.method, meta.url, state.config.getUserString( envelope.user )
			);
			return next();
		} else {
			meta.authRejected();
			log.debug( 'User %s was denied HTTP activation of action %s (%s %s)',
				state.config.getUserString( envelope.user ), meta.alias, action.method, meta.url
			);
			return {
				status: 403,
				//headers: { 'Content-Type': 'application/json' },
				data: { message: 'User lacks sufficient permissions' }
			};
		}
	}

	return permissionCheck()
		.then( onPermission, onError );
}

function executeStack( resource, action, envelope, stack ) {
	var calls = stack.slice( 0 );
	var call = calls.shift();
	if( call ) {
		return call.bind( resource )( envelope, executeStack.bind( undefined, resource, action, envelope, calls ) );
	} else {
		log.error( 'Invalid middelware was supplied in resource "%s", action "%s".', resource.name, action.name );
		return { status: 500, data: { message: 'The server failed to provide a response' } };
	}
}

function getActionMetadata( state, resource, actionName, action, meta, resources ) {
	var url = buildActionUrl( state, resource.name, actionName, action, resource, resources );
	var alias = buildActionAlias( resource.name, actionName );
	var resourceKey = [ [ resource.name, actionName ].join( '-' ), 'http' ];
	var metricKey = [ state.metrics.prefix ].concat( resourceKey );
	meta.routes[ actionName ] = { method: action.method, url: url };
	return {
		alias: alias,
		envelope: undefined,
		authAttempted: function() {
			state.metrics.authorizationAttempts.record( 1, { name: 'HTTP_AUTHORIZATION_ATTEMPTS' } );
		},
		authGranted: function() {
			state.metrics.authorizationGrants.record( 1, { name: 'HTTP_AUTHORIZATION_GRANTED' }  );
		},
		authRejected: function() {
			state.metrics.authorizationRejections.record( 1, { name: 'HTTP_AUTHORIZATION_REJECTED' } );
		},
		getEnvelope: function( req, res ) {
			var envelope = new state.Envelope( req, res, metricKey );
			this.envelope = envelope;
			return this.envelope;
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

function getHandler( handle ) {
	if( _.isFunction( handle ) ) {
		return handle;
	} else {
		var list = _.filter( _.map( handle, function( option ) {
			if( _.isFunction( option.when ) ) {
				return option;
			} else if( option.when === true ) {
				return {
					when: function() { return true; },
					then: option.then
				};
			} else if( _.isObject( option.when ) ) {
				return {
					when: _.matches( option.when ),
					then: option.then
				};
			} else {
				console.error(
					format(
						'Differentiated handle\'s \'when\' property must be a function or an object instead of \'%s\'. Option will not be included in potential outcomes.'
					), 
					option.when
				);
			}
		} ) );
		return function( envelope ) {
			var option = _.find( list, function( option ) {
				return option.when( envelope );
			} );
			if( option ) {
				return option.then( envelope );	
			} else {
				return { status: 400, data: 'The request failed to meet any of the supported conditions' };
			}
		};
	}
}

function getPermissionCheck( state, meta, resource, action, envelope ) {
	var check;
	if( action.authorize ) {
		check = function() {
			var can = action.authorize.bind( resource )( envelope, envelope.context );
			return can && can.then ? can : when.resolve( can );
		};
		return checkPermissionFor.bind( undefined, state, check, meta, action );
	} else if( state.auth && state.auth.checkPermission ) {
		check = state.auth.checkPermission.bind( state.auth, envelope.user, meta.alias, envelope.context );
		return checkPermissionFor.bind( undefined, state, check, meta, action );
	} else {
		return function( envelope, next ) { return next(); };
	}
}

function hasPrefix( state, url ) {
	var prefix = state.http.buildUrl(
		state.config.urlPrefix || '',
		state.config.apiPrefix || ''
	);
	return url.indexOf( prefix ) === 0;
}

function respond( state, meta, req, res, resource, action ) {
	var envelope = meta.getEnvelope( req, res );
	var result;
	var stack = [];
	var checkedPermissions = false;
	var authCheck = getPermissionCheck( state, meta, resource, action, envelope );
	if( resource.middleware ) {
		stack = stack.concat( resource.middleware );
	}
	if( action.middleware ) {
		stack = stack.concat( action.middleware );
	}

	// check to see if a placeholder for permission check
	// is in the stack to short-circuit expensive middleware calls
	// that would be unnecessary if the rquesting user lacks
	// requisite permissions
	stack = _.map( stack, function( f ) {
		if( f === 'authorize' ) {
			checkedPermissions = true;
			return authCheck;
		} else {
			return f;
		}
	} );
	if( !checkedPermissions ) {
		stack.push( authCheck );
	}
	stack.push( action.handle );

	if ( meta.handleErrors ) {
		try {
			result = executeStack( resource, action, envelope, stack );
		} catch ( err ) {
			log.error( 'API EXCEPTION! route: %s %s failed with %s',
				action.method.toUpperCase(), action.url, err.stack );
			result = err;
		}
	} else {
		result = executeStack( resource, action, envelope, stack );
	}
	if ( result ) {
		if ( result.then ) {
			var onResult = function onResult( x ) {
				if( x ) {
					envelope.handleReturn( state.config, resource, action, x );
				} else {
					log.warn( 'Handle at route: %s %s returned undefined',
						action.method.toUpperCase(), action.url );
				}
			};
			result.then( onResult, onResult );
		} else {
			envelope.handleReturn( state.config, resource, action, result );
		}
	}
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
		action.name = actionName;
		wireupAction( state, resource, actionName, action, meta, resources );
	} );
	return meta;
}

function wireupAction( state, resource, actionName, action, metadata, resources ) {
	var meta = getActionMetadata( state, resource, actionName, action, metadata, resources );
	log.debug( 'Mapping resource \'%s\' action \'%s\' to %s %s',
		resource.name, actionName, action.method, meta.url );

	state.http.route( meta.url, action.method, function( req, res ) {
		meta.getEnvelope( req, res );

		req._metricKey = meta.metricKey;
		req._resource = resource.name;
		req._action = actionName;
		req._timer = meta.getTimer();
		action.handle = getHandler( action.handle );
		respond( state, meta, req, res, resource, action );
	} );
}

module.exports = function( config, auth, http, req ) {
	var state = {
		auth: auth,
		config: config,
		http: http,
		name: 'http',
		metrics: metronic()
	};
	_.merge( state, {
		Envelope: require( './httpEnvelope.js' )( req ),
		action: wireupAction.bind( undefined, state ),
		passport: setupPassport( config, auth ),
		resource: wireupResource.bind( undefined, state ),
		start: start.bind( undefined, state ),
		stop: stop.bind( undefined, state )
	} );
	return state;
};
