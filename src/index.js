var path = require( 'path' ),
	metrics = require( 'cluster-metrics' ),
	request = require( 'request' ).defaults( { jar: true } ),
	when = require( 'when' ),
	passportFn = require( './http/passport.js' ),
	httpFn = require( './http/http.js' ),
	httpAdapterFn = require( './http/adapter.js' ),
	socketFn = require( './websocket/socket.js' ),
	socketAdapterFn = require( './websocket/adapter.js' ),
	wrapper = {
	 	actions: undefined,
	 	auth: undefined,
		config: undefined,
		init: initialize,
		metrics: metrics,
		request: request,
		meta: undefined,
		http: undefined,
		socket: undefined
	},
	api = require( './api.js' )( wrapper ),
	passport, httpAdapter, socketAdapter, middleware;

function initialize( cfg, authProvider ) {
	wrapper.config = cfg;
	if( when.isPromiseLike( authProvider ) ) {
		authProvider
			.then( function( result ) {
				wrapper.auth = result;
				setup( result );
			} );
	} else {
		wrapper.auth = authProvider;
		setup( authProvider );
	}
}

function setup( authProvider ) {
	var config = wrapper.config,
		metrics = wrapper.metrics;

	if( authProvider ) {
		passport = passportFn( config, authProvider, metrics );
	}

	wrapper.http = httpFn( config, request, passport, metrics );
	httpAdapter = httpAdapterFn( config, authProvider, wrapper.http, request, metrics );
	api.addAdapter( httpAdapter );

	// API metadata
	wrapper.http.middleware( '/api', function( req, res, next ) {
		if( req.method == 'OPTIONS' || req.method == 'options' ) {
			res.status( 200 ).send( wrapper.meta );
		} else {
			next();
		}
	} );
	
	wrapper.socket = socketFn( config, wrapper.http );
	socketAdapter = socketAdapterFn( config, passport, metrics );
	api.addAdapter( socketAdapter );

	api.start( config.resources || path.join( process.cwd(), './resources' ), authProvider )
		.then( function( meta ) {
			meta.prefix = config.apiPrefix || '/api';
			wrapper.meta = meta;
		} );
}

module.exports = wrapper;