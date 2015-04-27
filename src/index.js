var _ = require( 'lodash' );
var path = require( 'path' );
var request = require( 'request' );
var when = require( 'when' );
var httpFn = require( './http/http' );
var httpAdapterFn = require( './http/adapter' );
var socketFn = require( './websocket/socket' );
var socketAdapterFn = require( './websocket/adapter' );
var middlewareLib = require( './http/middleware' );
var postal = require( 'postal' );
var eventChannel = postal.channel( 'events' );
var internalFount = require( 'fount' );

function initialize( config, authProvider, fount ) {
	var middleware = middlewareLib();
	require( './log' )( config.logging || {} );

	var state = {
		actions: undefined,
		auth: undefined,
		config: config,
		fount: fount || config.fount || internalFount,
		http: httpFn( request, middleware ),
		meta: undefined,
		metrics: require( './metrics' )( config.metrics || {} ),
		request: request,
		resources: {},
		socket: undefined,
		session: middleware.sessionLib
	};
	var transport = require( './transport' )( state, config );
	function onResources( x ) {
		process.nextTick( function() {
			eventChannel.publish( 'resources.loaded', x.resources );
		} );
	}
	_.merge( state, {
		on: onEvent,
		onResources: onEvent.bind( undefined, 'resources.loaded' ),
		start: function() {
			transport.startAdapters();
			when( transport.resources )
				.then( onResources );
		},
		stop: transport.stop
	} );

	middleware.configure( config );
	if ( when.isPromiseLike( authProvider ) ) {
		authProvider
			.then( function( auth ) {
				state.auth = auth;
				setup( state, transport, auth )
					.then( onResources );
			} );
	} else {
		state.auth = authProvider;
		setup( state, transport, authProvider )
			.then( onResources );
	}
	return state;
}

function onEvent( topic, handle ) {
	return eventChannel.subscribe( topic, handle );
}

function setup( state, transport, authProvider ) {
	var config = state.config;
	var transportPrefix = config.transportPrefix === undefined ? '/api' : config.transportPrefix;

	var httpAdapter = httpAdapterFn( config, authProvider, state.http, request );
	transport.addAdapter( httpAdapter );
	state.passport = httpAdapter.passport;

	// API metadata
	if ( !config.noOptions ) {
		state.http.middleware( transportPrefix, function( req, res, next ) {
			if ( req.method === 'OPTIONS' || req.method === 'options' ) {
				res.status( 200 ).send( state.meta );
			} else {
				next();
			}
		} );
	}

	state.socket = socketFn( config, state.http );
	var socketAdapter = socketAdapterFn( config, authProvider, state.socket );
	transport.addAdapter( socketAdapter );

	return transport.start( config.resources || path.join( process.cwd(), './resource' ), authProvider )
		.then( function( meta ) {
			meta.prefix = transportPrefix;
			state.meta = meta;
			state.resources = transport.resources;
			return state;
		} );
}

module.exports = initialize;
