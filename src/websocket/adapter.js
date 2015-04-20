var config;
var authStrategy;
var socket;
var SocketEnvelope;
var _ = require( 'lodash' );
var metronic = require( '../metrics' );
var log = require( '../log' )( 'autohost.websocket.adapter' );
var metrics;
var wrapper = {
	name: 'http',
	action: wireupAction,
	resource: wireupResource,
	start: start,
	stop: stop
};

function buildActionAlias( resourceName, actionName ) {
	return [ resourceName, actionName ].join( '.' );
}

function buildActionTopic( resourceName, action ) {
	return [ resourceName, action.topic ].join( '.' );
}

function checkPermissionFor( user, context, action ) {
	log.debug( 'Checking %s\'s permissions for %s', getUserString( user ), action );
	return authStrategy.checkPermission( user, action, context )
		.then( null, function( err ) {
			log.debug( 'Error during check permissions: %s', err.stack );
			return false;
		} )
		.then( function( granted ) {
			return granted;
		} );
}

function getUserString( user ) {
	return user.name ? user.name : JSON.stringify( user );
}

function start() {
	socket.start( authStrategy );
}

function stop() {
	socket.stop();
}

function wireupResource( resource ) {
	var meta = { topics: {} };
	_.each( resource.actions, function( action, actionName ) {
		wireupAction( resource, actionName, action, meta );
	} );
	return meta;
}

function wireupAction( resource, actionName, action, meta ) {
	var topic = buildActionTopic( resource.name, action );
	var alias = buildActionAlias( resource.name, actionName );
	var errors = metrics.meter( [ topic, 'error' ] );
	var metricKey = [ metrics.prefix, [ resource.name, actionName ].join( '-' ), 'ws' ];
	meta.topics[ actionName ] = { topic: topic };
	log.debug( 'Mapping resource \'%s\' action \'%s\' to topic %s', resource.name, actionName, alias );
	socket.on( topic, function( message, client ) {
		var data = message.data || message;
		var resourceTimer = metrics.timer( [ resource.name + '-' + actionName, 'ws', 'duration' ] );
		var respond = function() {
			var envelope = new SocketEnvelope( topic, message, client, metricKey, resourceTimer );
			if ( config && config.handleRouteErrors ) {
				try {
					action.handle.apply( resource, [ envelope ] );
				} catch ( err ) {
					errors.record();
					client.publish( data.replyTo || topic, 'Server error at topic ' + topic );
				}
			} else {
				action.handle.apply( resource, [ envelope ] );
			}

		};
		if ( authStrategy ) {
			checkPermissionFor( client.user, {}, alias )
				.then( function( pass ) {
					if ( pass ) {
						metrics.authorizationGrants.record();
						log.debug( 'WS activation of action %s for %s granted', alias, getUserString( client.user ) );
						respond();
					} else {
						metrics.authorizationRejections.record();
						log.debug( 'User %s was denied WS activation of action %s', getUserString( client.user ), alias );
						client.publish( data.replyTo || topic, 'User lacks sufficient permissions' );
					}
				} );
		} else {
			respond();
		}
	} );
}

module.exports = function( cfg, auth, sock ) {
	config = cfg;
	metrics = metronic();
	authStrategy = auth;
	socket = sock;
	SocketEnvelope = require( './socketEnvelope.js' );
	return wrapper;
};
