var request;
var _ = require( 'lodash' );

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
	this.session = req.session;
	this.responseStream = res;
	this._original = {
		req: req,
		res: res
	};

	[req.params, req.query].forEach(function(source){
		Object.keys(source).forEach(function(key){
			var val = source[ key ];
			if( !this.data[ key ] ) {
				this.data[ key ] = val;
			}
			this.params[ key ] = val;
		}.bind(this));
	}.bind(this));

	if( req.extendHttp ) {
		_.each( req.extendHttp, function( val, key ) {
			this[ key ] = val;
		}.bind( this ) );
	}
}

HttpEnvelope.prototype.forwardTo = function( options ) {
	return this._original.req.pipe( request( options ) ).pipe( this._original.res );
};

HttpEnvelope.prototype.redirect = function( statusCode, url ) {
	if(url === undefined){
		url = statusCode;
		statusCode = 302;
	}
	this._original.res.redirect( statusCode, url );
};

HttpEnvelope.prototype.reply = function( envelope ) {
	var code = envelope.statusCode || 200;
	if( envelope.headers ) {
		_.each( envelope.headers, function( v, k ) {
			this._original.res.set( k, v );
		}.bind( this ) );
	}
	if( envelope.cookies ) {
		_.each( envelope.cookies, function( v, k ) {
			this._original.res.cookie( k, v.value, v.options );
		}.bind( this ) );
	}
	this._original.res.status( code ).send( envelope.data );
};

HttpEnvelope.prototype.replyWithFile = function( contentType, fileName, fileStream ) {
	this._original.res.set( {
			'Content-Disposition': 'attachment; filename="' + fileName + '"',
			'Content-Type': contentType
		} );
	fileStream.pipe( this._original.res );
};

module.exports = function( req ) {
	request = req;
	return HttpEnvelope;
};