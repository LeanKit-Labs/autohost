var path = require( 'path' );
var _ = require( 'lodash' );
var debug = require( '../debug.js' )( 'autohost:http-adapter' );
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
	return action.url || http.buildUrl( ( config.apiPrefix || 'api' ), resourceName, ( action.path || '' ) );
}

function buildActionAlias( resourceName, action ) {
	return [ resourceName, action.alias ].join( '.' );
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
			debug.site( 'Error during check permissions: %s', err.stack );
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
	_.each( resource.actions, function( action ) {
		wireupAction( resource, action, meta );
	} );
	return meta;
}

function wireupAction( resource, action, meta ) {
	var url = buildActionUrl( resource.name, action ),
		alias = buildActionAlias( resource.name, action );
	meta.routes[ action.alias ] = { verb: action.verb, url: url };
	debug( 'Mapping resource \'%s\' action \'%s\' to %s %s', resource.name, action.alias, action.verb, url );
	http.route( url, action.verb, function( req, res ) {
		var respond = function() {
			var envelope = new HttpEnvelope( req, res );
			try {
				action.handle.apply( resource, [ envelope ] );
			} catch( err ) {
				debug.site('Unhandled exception in resource [%s];\n', resource.name, err.stack );
				envelope.reply( { statusCode: 500, data:'An error occurred while processing this request.' } );
			};
		};
		if( authStrategy ) {
			checkPermissionFor( req.user, alias )
				.then( function( pass ) {
					if( pass ) {
						debug( 'HTTP activation of action %s (%s %s) for %s granted', alias, action.verb, url, req.user.name );
						respond();
					} else {
						debug( 'User %s was denied HTTP activation of action %s (%s %s)', req.user.name, alias, action.verb, url );
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