var _ = require( 'lodash' );
var log = require( '../log' )( 'autohost.websocket.adapter' );

function buildActionAlias( resourceName, actionName ) {
	return [ resourceName, actionName ].join( '.' );
}

function buildActionTopic( resourceName, action ) {
	return [ resourceName, action.topic ].join( '.' );
}

function checkPermissionFor( state, user, context, action ) {
	log.debug( 'Checking %s\'s permissions for %s', state.config.getUserString( user ), action );
	return state.authProvider.checkPermission( user, action, context )
		.then( null, function( err ) {
			log.debug( 'Error during check permissions: %s', err.stack );
			return false;
		} )
		.then( function( granted ) {
			return granted;
		} );
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
	return {
		alias: alias,
		topic: topic,
	};
}

function respond( state, meta, resource, action, client, data, message ) {
	var envelope = new state.Envelope( meta.topic, message, client );
	var result;
	if ( state.config && state.config.handleRouteErrors ) {
		try {
			result = action.handle.apply( resource, [ envelope ] );
		} catch ( err ) {
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
		if ( state.authProvider ) {
			checkPermissionFor( state, client.user, {}, meta.alias )
				.then( function( pass ) {
					if ( pass ) {
						log.debug( 'WS activation of action %s for %s granted',
							meta.alias, state.config.getUserString( client.user ) );
						respond( state, meta, resource, action, client, data, message );
					} else {
						log.debug( 'User %s was denied WS activation of action %s',
							state.config.getUserString( client.user ), meta.alias );
						client.publish( data.replyTo || meta.topic,
							'User lacks sufficient permissions' );
					}
				} );
		} else {
			respond( state, meta, resource, action, client, data, message );
		}
	} );
}

module.exports = function( config, authProvider, socket ) {
	var state = {
		authProvider: authProvider,
		config: config,
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
