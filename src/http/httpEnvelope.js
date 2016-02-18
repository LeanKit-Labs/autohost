var request;
var _ = require( 'lodash' );
var fs = require( 'fs' );
var path = require( 'path' );
var metrics = require( '../metrics' )();

function HttpEnvelope( req, res, metricKey ) {
	this.transport = 'http';
	this.context = req.context;
	this.cookies = req.cookies;
	this.data = req.body || {};
	this.files = req.files;
	this.headers = req.headers;
	this.logout = function() {
		req.logout();
	};
	this.metricKey = metricKey;
	this.params = {};
	this.path = this.url = req.url;
	this.method = req.method.toLowerCase();
	this.responseStream = res;
	this.session = req.session;
	this.user = req.user;
	this._original = {
		req: req,
		res: res
	};
	this.exceptions = metrics.meter( this.metricKey.concat( 'exceptions' ) );
	this.errors = metrics.meter( this.metricKey.concat( 'errors' ) );

	[ req.params, req.query ].forEach( function( source ) {
		Object.keys( source ).forEach( function( key ) {
			var val = source[ key ];
			if ( !_.has( this.data, key ) ) {
				this.data[ key ] = val;
			}
			if ( !_.has( this.params, key ) ) {
				this.params[ key ] = val;
			}
		}.bind( this ) );
	}.bind( this ) );

	if ( req.extendHttp ) {
		_.each( req.extendHttp, function( val, key ) {
			this[ key ] = val;
		}.bind( this ) );
	}
}

HttpEnvelope.prototype.forwardTo = function( options ) {
	if ( !this._original.req.readable ) {
		var req = this._original.req;
		var original = {
			method: req.method,
			headers: req.headers
		};
		if ( req.body ) {
			original.body = req.body;
			if ( _.isObject( req.body ) ) {
				original.json = true;
			}
		}
		var forwarded = _.defaults( options, original );
		return request( forwarded ).pipe( this._original.res );
	} else {
		return this._original.req.pipe( request( options ) ).pipe( this._original.res );
	}
};

HttpEnvelope.prototype.redirect = function( statusCode, url ) {
	if ( url === undefined ) {
		url = statusCode;
		statusCode = 302;
	}
	this._original.res.redirect( statusCode, url );
};

HttpEnvelope.prototype.reply = function( envelope ) {
	var code = envelope.statusCode || envelope.status || 200;
	if ( envelope.headers ) {
		_.each( envelope.headers, function( v, k ) {
			this._original.res.set( k, v );
		}.bind( this ) );
	}
	if ( envelope.cookies ) {
		_.each( envelope.cookies, function( v, k ) {
			this._original.res.cookie( k, v.value, v.options );
		}.bind( this ) );
	}
	this._original.res.status( code ).send( envelope.data );
};

HttpEnvelope.prototype.handleReturn = function( host, resource, action, result ) {
	if ( result instanceof Error ) {
		this.renderError( host, resource, action, result );
	} else {
		if ( result.file ) {
			this.replyWithFile( result.file.type, result.file.name, result.file.stream, result.status );
		} else if ( result.forward ) {
			this.forwardTo( result.forward );
		} else if ( result.redirect ) {
			this.redirect( result.redirect.status || 302, result.redirect.url );
		} else {
			this.reply( this.render( host, resource, action, result ) );
		}
	}
};

HttpEnvelope.prototype.render = function( host, resource, action, result ) {
	var envelope = { status: 200 };
	if ( result.data || result.status ) {
		_.merge( envelope, result );
	} else {
		envelope.data = result;
	}
	return envelope;
};

HttpEnvelope.prototype.renderError = function( host, resource, action, error ) {
	var defaultStrategy = {
		status: 500,
		body: { message: 'Server error' }
	};
	var hostError = host.errors ? host.errors[ error.name ] : undefined;
	var resourceError = resource.errors ? resource.errors[ error.name ] : undefined;
	var actionError = action.errors ? action.errors[ error.name ] : undefined;
	var strategy = _.merge(
		defaultStrategy,
		hostError,
		resourceError,
		actionError
	);

	if ( strategy.status >= 500 ) {
		this.exceptions.record( 1, { name: 'HTTP_API_EXCEPTIONS' } );
	} else {
		this.errors.record( 1, { name: 'HTTP_API_ERRORS' } );
	}
	var filePath = strategy.file ? path.resolve( host.static, strategy.file ) : '';
	if ( fs.existsSync( filePath ) ) {
		this.replyWithFile( 'text/html', undefined, fs.createReadStream( filePath ), strategy.status );
	} else {
		var reply = {
			status: strategy.status,
			data: strategy.reply ? strategy.reply( error, this ) : strategy.body
		};
		this.reply( this.render( host, resource, action, reply ) );
	}
};

HttpEnvelope.prototype.replyWithFile = function( contentType, fileName, fileStream, status ) {
	status = status || 200;
	var headers = {
		'Content-Type': contentType
	};
	if ( fileName ) {
		headers[ 'Content-Disposition' ] = 'attachment; filename="' + fileName + '"';
	}
	this._original.res.status( status );
	this._original.res.set( headers );
	fileStream.pipe( this._original.res );
};

module.exports = function( req ) {
	request = req;
	return HttpEnvelope;
};
