var config;
var authStrategy;
var socket;
var metrics;
var SocketEnvelope;
var _ = require( 'lodash' );
var debug = require( 'debug' )( 'autohost:websocket-adapter' );
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
	debug( 'Checking %s\'s permissions for %s', getUserString( user ), action );
	return authStrategy.checkPermission( user, action, context )
		.then( null, function( err ) {
			debug( 'Error during check permissions: %s', err.stack );
			return false;
		} )
		.then( function( granted ) {
			return granted;
		} );
}

function getUserString( user ) { // jshint ignore:line
	return user.name ? user.name : JSON.stringify( user );
}

function start() { // jshint ignore:line
	socket.start( authStrategy );
}

function stop() { // jshint ignore:line
	socket.stop();
}

function wireupResource( resource ) { // jshint ignore:line
	var meta = { topics: {} };
	_.each( resource.actions, function( action, actionName ) {
			wireupAction( resource, actionName, action, meta );
		} );
	return meta;
}

function wireupAction( resource, actionName, action, meta ) { // jshint ignore:line
	var topic = buildActionTopic( resource.name, action );
	var alias = buildActionAlias( resource.name, actionName );

	meta.topics[ actionName ] = { topic: topic };
	debug( 'Mapping resource \'%s\' action \'%s\' to topic %s', resource.name, actionName, alias );
	socket.on( topic, function( message, socket ) {
		var data = message.data || message;
		var respond = function() {
			var envelope = new SocketEnvelope( topic, message, socket );
			action.handle.apply( resource, [ envelope ] );
		};
		if ( authStrategy ) {
			checkPermissionFor( socket.user, {}, alias )
				.then( function( pass ) {
					if ( pass ) {
						debug( 'WS activation of action %s for %s granted', alias, getUserString( socket.user ) );
						respond();
					} else {
						debug( 'User %s was denied WS activation of action %s', getUserString( socket.user ), alias );
						socket.publish( data.replyTo || topic, 'User lacks sufficient permission' );
					}
				} );
		} else {
			respond();
		}
	} );
}

module.exports = function( cfg, auth, sock, meter ) {
	config = cfg;
	authStrategy = auth;
	socket = sock;
	metrics = meter;
	SocketEnvelope = require( './socketEnvelope.js' );
	return wrapper;
};
