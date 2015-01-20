var config, socketIO, websocket, http;
var _ = require( 'lodash' );
var postal = require( 'postal' );
var eventChannel = postal.channel( 'events' );
var debug = require( 'debug' )( 'autohost:ws-transport' );
var clients = [];
var wrapper, websocket, socketIO;
reset();

wrapper.clients.lookup = {};

function addClient( socket ) { // jshint ignore:line
	wrapper.clients.push( socket );
	if ( socket.user !== 'anonymous' ) {
		socketIdentified( socket.user, socket );
	}
	eventChannel.publish( 'socket.client.connected', { socket: socket } );
}

function socketIdentified( id, socket ) { // jshint ignore:line
	if ( wrapper.clients.lookup[ id ] ) {
		wrapper.clients.lookup[ id ].push( socket );
	} else {
		wrapper.clients.lookup[ id ] = [ socket ];
	}
	eventChannel.publish( 'socket.client.identified', { id: id, socket: socket } );
}

function notifyClients( message, data ) { // jshint ignore:line
	debug( 'Notifying %d clients: %s %s', wrapper.clients.length, message, JSON.stringify( data ) );
	_.each( wrapper.clients, function( client ) {
		client.publish( message, data );
	} );
}

function onTopic( topic, handle, context ) { // jshint ignore:line
	debug( 'TOPIC: %s -> %s', topic, ( handle.name || 'anonymous' ) );
	var original = handle;
	if ( config && config.handleRouteErrors ) {
		handle = function( data, socket ) {
			try {
				original( data, socket );
			} catch (err) {
				socket.publish( data.replyTo || topic, 'Server error at topic ' + topic );
			}
		};
	}
	wrapper.topics[ topic ] = handle;
	if ( socketIO ) {
		socketIO.on( topic, handle );
	}
	if ( websocket ) {
		websocket.on( topic, handle );
	}
}

function removeClient( socket ) { // jshint ignore:line
	var index = wrapper.clients.indexOf( socket );
	if ( index >= 0 ) {
		wrapper.clients.splice( index, 1 );
	}
	if ( socket.id && wrapper.clients.lookup[ socket.id ] ) {
		var list = wrapper.clients.lookup[ socket.id ];
		index = list.indexOf( socket );
		if ( index >= 0 ) {
			list.splice( index, 1 );
		}
	}
	eventChannel.publish( 'socket.client.closed', { id: socket.id, socket: socket } );
}

function reset() { // jshint ignore:line
	wrapper = {
		add: addClient,
		clients: clients,
		identified: socketIdentified,
		notify: notifyClients,
		on: onTopic,
		remove: removeClient,
		reset: reset,
		send: sendToClient,
		start: start,
		stop: stop,
		topics: {}
	};
}

function sendToClient( id, message, data ) { // jshint ignore:line
	debug( 'Sending to clients %s: %s %s', id, message, JSON.stringify( data ) );
	var sockets = wrapper.clients.lookup[ id ];
	if ( !sockets ) {
		sockets = _.where( wrapper.clients, function( client ) {
			return client.user.id === id || client.user.name === id;
		} );
	}
	if ( sockets ) {
		_.each( sockets, function( socket ) {
			socket.publish( message, data );
		} );
		return true;
	}
	return false;
}

function start() { // jshint ignore:line
	if ( config.socketio || config.socketIO || config.socketIo ) {
		socketIO = require( './socketio.js' )( config, wrapper, http.passport );
		socketIO.config( http );
	}
	if ( config.websocket || config.websockets ) {
		websocket = require( './websocket' )( config, wrapper, http.passport );
		websocket.config( http );
	}
}

function stop() { // jshint ignore:line
	_.each( wrapper.clients, function( socket ) {
		if ( socket ) {
			socket.removeAllListeners();
			socket.close();
		}
	} );
	if ( socketIO ) {
		socketIO.stop();
	}
	if ( websocket ) {
		websocket.stop();
	}
}

module.exports = function( cfg, httpLib, resetState ) {
	if ( resetState ) {
		reset();
	}
	config = cfg;
	http = httpLib;
	return wrapper;
};
