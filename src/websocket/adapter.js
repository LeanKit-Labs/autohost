var _ = require( 'lodash' );
var metronic = require( '../metrics' );
var log = require( '../log' )( 'autohost.websocket.adapter' );

function buildActionAlias( resourceName, actionName ) {
	return [ resourceName, actionName ].join( '.' );
}

function buildActionTopic( resourceName, action ) {
	return [ resourceName, action.topic ].join( '.' );
}

function checkPermissionFor( state, user, context, action ) {
	log.debug( 'Checking %s\'s permissions for %s', getUserString( user ), action );
	return state.authProvider.checkPermission( user, action, context )
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

function start( state ) {
	state.socket.start( state.authProvider );
}

function stop( state ) {
	state.socket.stop();
}

function wireupResource( state, resource ) {
	var meta = { topics: {} };
	_.each( resource.actions, function( action, actionName ) {
		wireupAction( state, resource, actionName, action, meta );
	} );
	return meta;
}

function getMetadata( state, resource, actionName, action ) {
	var topic = buildActionTopic( resource.name, action );
	var alias = buildActionAlias( resource.name, actionName );
	var errors = state.metrics.meter( [ topic, 'error' ] );
	var metricKey = [ state.metrics.prefix, [ resource.name, actionName ].join( '-' ), 'ws' ];
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
		topic: topic,
		errors: errors,
		metricKey: metricKey
	};
}

function respond( state, meta, resource, action, client, data, message, resourceTimer ) {
	var envelope = new state.Envelope( meta.topic, message, client, meta.metricKey, resourceTimer );
	var result;
	if ( state.config && state.config.handleRouteErrors ) {
		try {
			result = action.handle.apply( resource, [ envelope ] );
		} catch ( err ) {
			meta.errors.record();
			client.publish( data.replyTo || meta.topic,
				'Server error at topic ' + meta.topic );
		}
	} else {
		result = action.handle.apply( resource, [ envelope ] );
	}
	if ( result ) {
		if ( result.then ) {
			var onResult = function onResult( x ) {
				envelope.handleReturn( state.config, resource, action, x );
			};
			result.then( onResult, onResult );
		} else {
			envelope.handleReturn( state.config, resource, action, result );
		}
	}
}

function wireupAction( state, resource, actionName, action, metadata ) {
	var meta = getMetadata( state, resource, actionName, action, metadata );
	metadata.topics[ actionName ] = { topic: meta.topic };
	log.debug( 'Mapping resource \'%s\' action \'%s\' to topic %s', resource.name, actionName, meta.alias );
	state.socket.on( meta.topic, function( message, client ) {
		var data = message.data || message;
		var resourceTimer = state.metrics.timer( [ resource.name + '-' + actionName, 'ws', 'duration' ] );
		if ( state.authProvider ) {
			checkPermissionFor( state, client.user, {}, meta.alias )
				.then( function( pass ) {
					if ( pass ) {
						meta.authGranted();
						log.debug( 'WS activation of action %s for %s granted',
							meta.alias, getUserString( client.user ) );
						respond( state, meta, resource, action, client, data, message, resourceTimer );
					} else {
						meta.authRejected();
						log.debug( 'User %s was denied WS activation of action %s',
							getUserString( client.user ), meta.alias );
						client.publish( data.replyTo || meta.topic,
							'User lacks sufficient permissions' );
					}
				} );
		} else {
			respond( state, meta, resource, action, client, data, message, resourceTimer );
		}
	} );
}

module.exports = function( config, authProvider, socket ) {
	var state = {
		authProvider: authProvider,
		config: config,
		metrics: metronic(),
		name: 'http',
		socket: socket
	};
	_.merge( state, {
		action: wireupAction.bind( undefined, state ),
		Envelope: require( './socketEnvelope.js' ),
		resource: wireupResource.bind( undefined, state ),
		start: start.bind( undefined, state ),
		stop: stop.bind( undefined, state )
	} );
	return state;
};
