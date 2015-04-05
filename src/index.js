var path = require( 'path' );
var request = require( 'request' );
var when = require( 'when' );
var httpFn = require( './http/http.js' );
var httpAdapterFn = require( './http/adapter.js' );
var socketFn = require( './websocket/socket.js' );
var socketAdapterFn = require( './websocket/adapter.js' );
var middlewareLib = require( './http/middleware.js' );
var postal = require( 'postal' );
var eventChannel = postal.channel( 'events' );
var internalFount = require( 'fount' );
var httpAdapter, socketAdapter;
var initialized, api;
var middleware = middlewareLib();
var wrapper = {
	actions: undefined,
	auth: undefined,
	config: undefined,
	fount: internalFount,
	init: initialize,
	request: request,
	meta: undefined,
	metrics: require( './metrics' ),
	http: httpFn( request, middleware ),
	socket: undefined,
	session: middleware.sessionLib,
	on: onEvent
};

function initialize( cfg, authProvider, fount ) {
	wrapper.fount = fount || internalFount;
	api = require( './api.js' )( wrapper, cfg );
	if ( initialized ) {
		api.startAdapters();
		return when( api.resources );
	} else {
		wrapper.config = cfg;
		wrapper.stop = api.stop;
		middleware.configure( cfg );
		if ( when.isPromiseLike( authProvider ) ) {
			return authProvider
				.then( function( result ) {
					wrapper.auth = result;
					return setup( result );
				} );
		} else {
			wrapper.auth = authProvider;
			return setup( authProvider );
		}
	}
}

function onEvent( topic, handle ) {
	eventChannel.subscribe( topic, handle );
}

function setup( authProvider ) {
	var config = wrapper.config;
	var metrics = wrapper.metrics;
	var apiPrefix = config.apiPrefix === undefined ? '/api' : config.apiPrefix;

	httpAdapter = httpAdapterFn( config, authProvider, wrapper.http, request );
	api.addAdapter( httpAdapter );
	wrapper.passport = httpAdapter.passport;

	// API metadata
	if ( !config.noOptions ) {
		wrapper.http.middleware( apiPrefix, function( req, res, next ) {
			if ( req.method === 'OPTIONS' || req.method === 'options' ) {
				res.status( 200 ).send( wrapper.meta );
			} else {
				next();
			}
		} );
	}

	wrapper.socket = socketFn( config, wrapper.http );
	socketAdapter = socketAdapterFn( config, authProvider, wrapper.socket );
	api.addAdapter( socketAdapter );

	return api.start( config.resources || path.join( process.cwd(), './resource' ), authProvider )
		.then( function( meta ) {
			meta.prefix = apiPrefix;
			wrapper.meta = meta;
			initialized = true;
			return api.resources;
		} );
}

module.exports = wrapper;
