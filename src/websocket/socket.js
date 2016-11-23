var _ = require( 'lodash' );
var postal = require( 'postal' );
var eventChannel = postal.channel( 'events' );
var log = require( '../log' )( 'autohost.ws.transport' );
var uuid = require( 'uuid' );

function addClient( state, socket ) {
	socket.connectionId = uuid.v4();
	state.clients.push( socket );

	var userId = getUserId( socket );
	if ( userId && userId !== 'anonymous' ) {
		socketIdentified( state, userId, socket );
	}

	eventChannel.publish( 'socket.client.connected', { socket: socket } );
}

function getUserId( socket ) {
	return socket.user && socket.user.id || socket.user.name;
}

function socketIdentified( state, id, socket ) {
	if ( state.clients.lookup[ id ] ) {
		state.clients.lookup[ id ].push( socket );
	} else {
		state.clients.lookup[ id ] = [ socket ];
	}
	eventChannel.publish( 'socket.client.identified', { id: id, socket: socket } );
}

function notifyClients( state, message, data ) {
	log.debug( 'Notifying %d clients: %s %j',
		state.clients.length, message, data );
	_.each( state.clients, function( client ) {
		client.publish( message, data );
	} );
}

function onTopic( state, topic, handle /* context */ ) {
	log.debug( 'TOPIC: %s -> %s', topic, ( handle.name || 'anonymous' ) );
	var safe = function( data, socket ) {
		if ( state.config && state.config.handleRouteErrors ) {
			try {
				handle( data, socket );
			} catch ( err ) {
				socket.publish( data.replyTo || topic, 'Server error at topic ' + topic );
			}
		} else {
			handle( data, socket );
		}
	};

	state.topics[ topic ] = safe;
	if ( state.socketIO ) {
		state.socketIO.on( topic, safe );
	}
	if ( state.websocket ) {
		state.websocket.on( topic, safe );
	}
}

function removeClient( state, socket ) {
	var index = state.clients.indexOf( socket );
	if ( index >= 0 ) {
		state.clients.splice( index, 1 );
	}

	var lookupKey = getUserId( socket ) || socket.id;
	if ( lookupKey && state.clients.lookup[ lookupKey ] ) {
		var list = state.clients.lookup[ lookupKey ];
		index = list.indexOf( socket );
		if ( index >= 0 ) {
			list.splice( index, 1 );

			if( list.length === 0 ) {
				delete state.clients.lookup[ lookupKey ];
			}
		}
	}
	eventChannel.publish( 'socket.client.closed', { id: socket.id, socket: socket } );
}

function reset( state ) {
	state.clients = [];
	state.topics = {};
	state.clients.lookup = {};
}

function sendToClient( state, id, message, data ) {
	log.debug( 'Sending to clients %s: %s %j', id, message, data );
	var sockets = state.clients.lookup[ id ];
	if ( !sockets ) {
		sockets = _.filter( state.clients, function( client ) {
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

function start( state ) {
	state.config.socketio = ( state.config.socketio || state.config.socketIO || state.config.socketIo )
	if ( state.config.socketio ) {
		state.socketIO = require( './socketio.js' )( state.config, state, state.http.passport );
		state.socketIO.configure( state.http );
	}
	if ( state.config.websocket || state.config.websockets ) {
		state.websocket = require( './websocket' )( state.config, state, state.http.passport );
		state.websocket.configure( state.http );
	}
}

function stop( state ) {
	_.each( state.clients, function( socket ) {
		if ( socket !== undefined ) {
			socket.removeAllListeners();
			socket.close();
		}
	} );
	if ( state.socketIO ) {
		state.socketIO.stop();
	}
	if ( state.websocket ) {
		state.websocket.stop();
	}
}

module.exports = function( config, http ) {
	var state = {
		clients: [],
		config: config,
		http: http,
		topics: {}
	};
	_.merge( state, {
		add: addClient.bind( undefined, state ),
		identified: socketIdentified.bind( undefined, state ),
		notify: notifyClients.bind( undefined, state ),
		on: onTopic.bind( undefined, state ),
		remove: removeClient.bind( undefined, state ),
		reset: reset.bind( undefined, state ),
		send: sendToClient.bind( undefined, state ),
		start: start.bind( undefined, state ),
		stop: stop.bind( undefined, state ),
	} );
	state.clients.lookup = {};
	return state;
};
