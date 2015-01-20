var _ = require( 'lodash' );
var SocketStream = require( './socketStream.js' );

function parseCookies( socket ) {
	var cookies = socket.headers.cookie.split( ';' );
	return _.reduce( cookies, function( acc, cookie ) {
		var parts = cookie.split( '=' );
		acc[ parts[ 0 ] ] = parts[ 1 ];
		return acc;
	}, {} );
}

function SocketEnvelope( topic, message, socket ) {
	this.transport = 'websocket';
	this.context = socket.context;
	this.data = message.data || message || {};
	this.cookies = socket.cookies || parseCookies( socket );
	this.headers = socket.headers;
	this.params = {};
	this.user = socket.user;
	this.replyTo = this.data.replyTo || topic;
	this.responseStream = new SocketStream( this.replyTo || topic, socket );
	this.session = socket.session;
	this.logout = function() {
		socket.logout();
	};
	this._original = {
		message: message,
		socket: socket
	};
}

SocketEnvelope.prototype.forwardTo = function( /* options */ ) {
	throw new Error( 'Sockets do not support proxying via forwardTo.' );
};

SocketEnvelope.prototype.redirect = function( /* options */ ) {
	this.reply( { data: 'The resource you are trying to reach has moved.' } );
	throw new Error( 'Sockets do not support redirection.' );
};

SocketEnvelope.prototype.reply = function( envelope ) {
	var publish = this._original.message.data ? envelope : envelope.data;
	if ( _.isArray( publish ) ) {
		publish = { data: publish };
	}
	if ( envelope.headers && !publish.headers ) {
		publish._headers = envelope.headers;
	}
	this._original.socket.publish( this.replyTo, publish );
};

SocketEnvelope.prototype.replyWithFile = function( contentType, fileName, fileStream ) {
	this._original.socket.publish( this.replyTo, { start: true, fileName: fileName, contentType: contentType } );
	fileStream.pipe( this.responseStream );
};

module.exports = SocketEnvelope;
