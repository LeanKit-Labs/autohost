var SocketStream = require( './socketStream.js' );

function SocketEnvelope( topic, message, socket ) {
	this.transport = 'websocket';
	this.context = socket.context;
	this.data = message.data || message || {};
	this.cookies = socket.cookies;
	this.headers = socket.headers;
	this.user = socket.user;
	this.replyTo = this.data.replyTo || topic;
	this.responseStream = new SocketStream( this.replyTo, socket );
	this._original = {
		message: message,
		socket: socket
	};
}

SocketEnvelope.prototype.forwardTo = function( options ) {
	throw new Error( 'Sockets do not presently support proxying via forwardTo' );
};

SocketEnvelope.prototype.reply = function( envelope ) {
	if( this._original.message.data ) {
		this._original.socket.publish( this.replyTo, envelope );
	} else {
		this._original.socket.publish( this.replyTo, envelope.data );
	}
}

SocketEnvelope.prototype.replyWithFile = function( contentType, fileName, fileStream ) {
	this._original.socket.publish( { index: -1, fileName: filename, contentType: contentType } );
	fileStream.pipe( this.responseStream );
};

module.exports = SocketEnvelope;