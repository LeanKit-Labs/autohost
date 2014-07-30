var request;

function HttpEnvelope( req, res ) {
	this.transport = 'http';
	this.context = req.context;
	this.data = req.body || {};
	this.path = req.url;
	this.cookies = req.cookies;
	this.headers = req.headers;
	this.params = {};
	this.files = req.files;
	this.user = req.user;
	this.responseStream = res;
	this._original = {
		req: req,
		res: res
	};

	for( var key in req.params ) {
		var val = req.params[ key ];
		if( !this.data[ key ] ) {
			this.data[ key ] = val;
		}
		this.params[ key ] = val;
	}
	for( var key in req.query ) {
		var val = req.query[ key ];
		if( !this.data[ key ] ) {
			this.data[ key ] = val;
		}
		this.params[ key ] = val;
	}
}

HttpEnvelope.prototype.forwardTo = function( options ) {
	return this._original.req.pipe( request( options ) );
};

HttpEnvelope.prototype.reply = function( envelope ) {
	var code = envelope.statusCode || 200;
	this._original.res.status( code ).send( envelope.data );
};

HttpEnvelope.prototype.replyWithFile = function( contentType, fileName, fileStream ) {
	this._original.res.set( {
			'Content-Disposition': 'attachment; filename="' + fileName + '"',
			'Content-Type': contentType
		} );
	fileStream.pipe( this._original.res );
};

module.exports = function( request ) {
	request = request;
	return HttpEnvelope;
};