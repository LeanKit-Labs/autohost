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
	this.logout = function() {
		socket.logout();
	};
	this.params = {};
	this.replyTo = this.data.replyTo || topic;
	this.responseStream = new SocketStream( this.replyTo || topic, socket );
	this.session = socket.session;
	this.topic = topic;
	this.user = socket.user;
	this._original = {
		message: message,
		socket: socket
	};
}

SocketEnvelope.prototype.handleReturn = function( host, resource, action, result ) {
	if ( result instanceof Error ) {
		this.renderError( host, resource, action, result );
	} else {
		if ( result.file ) {
			this.replyWithFile( result.file.type, result.file.name, result.file.stream );
		} else if ( result.forward ) {
			this.forwardTo( result.forward );
		} else if ( result.redirect ) {
			this.redirect( result.redirect.status || 302, result.redirect.url );
		} else {
			this.render( host, resource, action, result );
		}
	}
};


SocketEnvelope.prototype.forwardTo = function( /* options */ ) {
	this.reply( {
		success: false,
		status: 400,
		data: 'The API call \'' + this.topic + '\' is not supported via websockets. Sockets do not support proxying via forwardTo.'
	} );
};

SocketEnvelope.prototype.redirect = function( /* options */ ) {
	this.reply( {
		success: false,
		status: 400,
		data: 'The resource you are trying to reach has moved.'
	} );
	throw new Error( 'Sockets do not support redirection.' );
};

SocketEnvelope.prototype.render = function( host, resource, action, result ) {
	var envelope = { success: true, status: 200, data: result };
	if ( result.data || result.success ) {
		_.merge( envelope, result );
	}
	if ( envelope.status > 100 && envelope.status < 300 ) {
		envelope.success = true;
	}
	this.reply( envelope );
};

SocketEnvelope.prototype.renderError = function( host, resource, action, error ) {
	var defaultStrategy = {
		status: 500,
		body: error.message
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

	var reply = {
		success: false,
		status: strategy.status ? strategy.status : 500,
		data: strategy.reply ? strategy.reply( error, this ) : strategy.body
	};
	this.reply( reply );
};

SocketEnvelope.prototype.reply = function( envelope ) {
	var publish;
	if ( this._original.message.data ) {
		publish = envelope;
		if ( publish.data.data ) {
			publish.data = publish.data.data;
			delete publish.data.data;
		}
		if ( envelope.headers ) {
			publish._headers = envelope.headers;
			delete publish.headers;
		}
	} else if ( envelope.data.data ) {
		publish = envelope.data;
	} else {
		publish = envelope.data;
	}
	if ( _.isArray( publish ) ) {
		publish = { data: publish };
	}
	if ( envelope.headers && !publish.headers ) {
		publish._headers = envelope.headers;
	}
	delete publish.cookies;
	this._original.socket.publish( this.replyTo, publish );
};

SocketEnvelope.prototype.replyWithFile = function( contentType, fileName, fileStream ) {
	this._original.socket.publish( this.replyTo, { start: true, fileName: fileName, contentType: contentType } );
	fileStream.pipe( this.responseStream );
};

module.exports = SocketEnvelope;
