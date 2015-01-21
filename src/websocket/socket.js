var config, socketIO, websocket, http;
var _ = require( 'lodash' );
var postal = require( 'postal' );
var eventChannel = postal.channel( 'events' );
var debug = require( 'debug' )( 'autohost:ws-transport' );
var wrapper, websocket, socketIO, metrics;
reset();

function addClient( socket ) {
	wrapper.clients.push( socket );
	if ( socket.user !== 'anonymous' ) {
		socketIdentified( socket.user, socket );
	}
	eventChannel.publish( 'socket.client.connected', { socket: socket } );
}

function socketIdentified( id, socket ) {
	if ( wrapper.clients.lookup[ id ] ) {
		wrapper.clients.lookup[ id ].push( socket );
	} else {
		wrapper.clients.lookup[ id ] = [ socket ];
	}
	eventChannel.publish( 'socket.client.identified', { id: id, socket: socket } );
}

function notifyClients( message, data ) {
	debug( 'Notifying %d clients: %s %s', wrapper.clients.length, message, JSON.stringify( data ) );
	_.each( wrapper.clients, function( client ) {
		client.publish( message, data );
	} );
}

function onTopic( topic, handle /* context */ ) {
	debug( 'TOPIC: %s -> %s', topic, ( handle.name || 'anonymous' ) );
	var errors = [ 'autohost', 'errors ', topic.replace( '.', ':' ) ].join( '.' );
	var safe = function( data, socket ) {
		if ( config && config.handleRouteErrors ) {
			try {
				handle( data, socket );
			} catch (err) {
				metrics.meter( errors ).record();
				socket.publish( data.replyTo || topic, 'Server error at topic ' + topic );
			}
		} else {
			handle( data, socket );
		}
	};

	wrapper.topics[ topic ] = safe;
	if ( socketIO ) {
		socketIO.on( topic, safe );
	}
	if ( websocket ) {
		websocket.on( topic, safe );
	}
}

function removeClient( socket ) {
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

function reset() {
	wrapper = {
		add: addClient,
		clients: [],
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
	wrapper.clients.lookup = {};
}

function sendToClient( id, message, data ) {
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

function start() {
	if ( config.socketio || config.socketIO || config.socketIo ) {
		socketIO = require( './socketio.js' )( config, wrapper, http.passport );
		socketIO.config( http );
	}
	if ( config.websocket || config.websockets ) {
		websocket = require( './websocket' )( config, wrapper, http.passport );
		websocket.config( http );
	}
}

function stop() {
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

module.exports = function( cfg, httpLib, metric, resetState ) {
	if ( resetState ) {
		reset();
	}
	metrics = metric;
	config = cfg;
	http = httpLib;
	return wrapper;
};
