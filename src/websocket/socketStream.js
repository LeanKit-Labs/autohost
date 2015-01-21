var Writable = require( 'stream' ).Writable;
var util = require( 'util' );

util.inherits( SocketStream, Writable );

function SocketStream( replyTo, socket ) {  
	Writable.call( this, { decodeStrings: false, objectMode: true } );
	this._socket = socket;
	this._index = 0;
	this._replyTo = replyTo;
}

SocketStream.prototype._write = function( chunk, encoding, callback ) {
	var envelope = {
		index: this._index++
	};
	envelope.data = chunk;
	this._socket.publish( this._replyTo, envelope );
	if ( callback ) {
		callback();
	}
	return true;
};

SocketStream.prototype.end = function() {
	this._socket.publish( this._replyTo, { end: true } );
	this.emit( 'finish' );
};

module.exports = SocketStream;
