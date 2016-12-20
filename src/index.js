var _ = require( 'lodash' );
var path = require( 'path' );
var request = require( 'request' );
var when = require( 'when' );
var httpFn = require( './http/http' );
var httpAdapterFn = require( './http/adapter' );
var socketFn = require( './websocket/socket' );
var socketAdapterFn = require( './websocket/adapter' );
var middlewareLib = require( './http/middleware' );
var sessionLib = require( 'express-session' );
var postal = require( 'postal' );
var eventChannel = postal.channel( 'events' );
var internalFount = require( 'fount' );

function initialize( config, authProvider, fount ) {
	config = config || {};
	_.defaults( config, {
		getUserString: function( user ) {
			return user && ( user.name || user.username || user.id || JSON.stringify( user ) );
		}
	} );
	if( typeof config.enableAccessLogs === "undefined") {
		config.enableAccessLogs = true;
	}
	authProvider = authProvider || config.authProvider;
	if ( config.logging && !_.isEmpty( config.logging ) ) {
		require( './log' )( config.logging );
	}
	var metrics = require( './metrics' )( config.metrics || {} );
	var middleware = middlewareLib( sessionLib );
	var http = httpFn( request, middleware );
	var socket = socketFn( config, http );
	var state = {
		actions: undefined,
		auth: undefined,
		config: config,
		fount: fount || config.fount || internalFount,
		http: http,
		meta: undefined,
		metrics: metrics,
		middleware: middleware,
		request: request,
		resources: {},
		socket: socket,
		session: sessionLib,
		transport: undefined
	};
	var transport = state.transport = require( './transport' )( state, config );
	function onResources( x ) {
		process.nextTick( function() {
			eventChannel.publish( 'resources.loaded', x.resources );
		} );
	}
	_.merge( state, {
		on: onEvent,
		onResources: onEvent.bind( undefined, 'resources.loaded' ),
		start: transport.start,
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
	transport.addAdapter( 'http', httpAdapter );
	state.passport = httpAdapter.passport;

	// API metadata
	if ( !config.noOptions ) {
		state.http.middleware( transportPrefix, function options( req, res, next ) {
			if ( req.method === 'OPTIONS' || req.method === 'options' ) {
				res.status( 200 ).send( state.meta );
			} else {
				next();
			}
		} );
	}

	var socketAdapter = socketAdapterFn( config, authProvider, state.socket );
	transport.addAdapter( 'ws', socketAdapter );

	return transport.init( config.resources || path.join( process.cwd(), './resource' ), authProvider )
		.then( function( meta ) {
			meta.prefix = transportPrefix;
			state.meta = meta;
			state.resources = transport.resources;
			return state;
		} );
}

initialize.sessionLib = sessionLib;
module.exports = initialize;
