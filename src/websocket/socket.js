var config, socketIO, websocket, http;
var _ = require( 'lodash' );
var postal = require( 'postal' );
var eventChannel = postal.channel( 'events' );
var debug = require( 'debug' )( 'autohost:ws-transport' );
var clients = [];
var wrapper = {
		add: addClient,
		clients: clients,
		identified: socketIdentified,
		notify: notifyClients,
		on: onTopic,
		remove: removeClient,
		send: sendToClient,
		start: start,
		stop: stop,
		topics: {}
	};

wrapper.clients.lookup = {};

function addClient( socket ) {
	wrapper.clients.push( socket );
	eventChannel.publish( 'socket.client.connected', { socket: socket } );
}

function socketIdentified( id, socket ) {
	wrapper.clients.lookup[ id ] = socket;
	eventChannel.publish( 'socket.client.identified', { id: id, socket: socket } );
}

function notifyClients( message, data ) {
	debug( 'Notifying %d clients: %s %s', wrapper.clients.length, message, JSON.stringify( data ) );
	_.each( wrapper.clients, function( client ) {
		client.publish( message, data );
	} );
}

function onTopic( topic, handle ) {
	debug( 'TOPIC: %s -> %s', topic, ( handle.name || 'anonymous' ) );
	wrapper.topics[ topic ] = handle;
	if( socketIO ) {
		socketIO.on( topic, handle );
	}
}

function removeClient( socket ) {
	var index = wrapper.clients.indexOf( socket );
	if( index >= 0 ) {
		wrapper.clients.splice( index, 1 );
	}
	if( socket.id ) {
		delete wrapper.clients.lookup[ socket.id ];
	}
	eventChannel.publish( 'socket.client.closed', { id: socket.id, socket: socket } );
}

function sendToClient( id, message, data ) {
	debug( 'Sending to clients %s: %s %s', id, message, JSON.stringify( data ) );
	var socket = wrapper.clients.lookup[ id ];
	if( !socket ) {
		socket = wrapper.clients.find( clients, function( client ) {
			return client.user.id === id || client.user.name === id;
		} );
	}
	if( socket ) {
		socket.publish( message, data );
		return true;
	} 
	return false;
}

function start() {
	if( config.socketio || config.socketIO || config.socketIo ) {
		socketIO = require( './socketio.js' )( config, wrapper, http.passport );
		socketIO.config( http );
	}
	if( config.websocket || config.websockets ) {
		websocket = require( './websocket' )( config, wrapper, http.passport );
		websocket.config( http );
	}
}

function stop() {
	_.each( wrapper.clients, function( socket ) {
		if( socket ) {
			socket.removeAllListeners();
			socket.close();
		}
	} );
	if( socketIO ) {
		socketIO.stop();
	}
	if( websocket ) {
		websocket.stop();
	}
}

module.exports = function( cfg, httpLib ) {
	config = cfg;
	http = httpLib;
	return wrapper;
};