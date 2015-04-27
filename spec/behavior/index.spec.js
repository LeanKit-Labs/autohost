require( '../setup' );
var fount = require( 'fount' );
var request = require( 'request' );
/*
var httpFn = require( './http/http.js' );
var httpAdapterFn = require( './http/adapter.js' );
var socketFn = require( './websocket/socket.js' );
var socketAdapterFn = require( './websocket/adapter.js' );
var middlewareLib = require( './http/middleware.js' );
require( './transport' );
*/

var middleware, http, httpAdapter, socket, socketAdapter, transport, log;
function getHost() {
	middleware = {
		configure: function( config ) {
			this.config = config;
			var args = Array.prototype.slice.call( arguments );
			this.args = args;
		}
	};
	var middlewareFn = function() {
		return middleware;
	};
	http = {
		middlewares: [],
		middleware: function( mw ) {
			this.middlewares.push( mw );
		}
	};
	var httpFn = function() {
		var args = Array.prototype.slice.call( arguments );
		http.args = args;
		return http;
	};
	httpAdapter = {};
	var httpAdapterFn = function() {
		var args = Array.prototype.slice.call( arguments );
		httpAdapter.args = args;
		return httpAdapter;
	};
	socket = {};
	var socketFn = function() {
		var args = Array.prototype.slice.call( arguments );
		socket.args = args;
		return socket;
	};
	socketAdapter = {};
	var socketAdapterFn = function() {
		var args = Array.prototype.slice.call( arguments );
		socketAdapter.args = args;
		return socketAdapter;
	};
	transport = {
		adapters: [],
		addAdapter: function( adapter ) {
			this.adapters.push( adapter );
		},
		start: function() {
			return when.resolve( {} );
		}
	};
	var transportFn = function() {
		var args = Array.prototype.slice.call( arguments );
		transport.args = args;
		return transport;
	};
	log = {};
	var logFn = function( config ) {
		log.config = config;
	};
	return require( 'proxyquire' )
		.noPreserveCache()
	( '../../src/index',
		{
			'./http/http': httpFn,
			'./http/adapter': httpAdapterFn,
			'./websocket/socket': socketFn,
			'./websocket/adapter': socketAdapterFn,
			'./http/middleware': middlewareFn,
			'./transport': transportFn,
			'./log': logFn
		}
	);
}

describe( 'Index', function() {
	describe( 'with defaults', function() {
		var host;
		before( function() {
			host = getHost()( { test: true } );
		} );

		it( 'should get internal fount reference', function() {
			host.fount.should.equal( fount );
		} );

		it( 'should pass configuration to middleware library', function() {
			middleware.args.should.eql( [ { test: true } ] );
		} );

		it( 'should pass state and configuration to transport library', function() {
			transport.args.should.eql( [ host, { test: true } ] );
		} );

		it( 'should initialize http adapter', function() {
			httpAdapter.args.should.eql( [
				{ test: true },
				undefined,
				http,
				request
			] );
		} );

		it( 'should initialize socket', function() {
			socket.args.should.eql( [ { test: true }, http ] );
		} );

		it( 'should initialize socket adapter', function() {
			socketAdapter.args.should.eql( [
				{ test: true },
				undefined,
				host.socket
			] );
		} );

		it( 'should add adpaters to transport', function() {
			transport.adapters.should.eql( [
				httpAdapter,
				socketAdapter
			] );
		} );
	} );

	describe( 'with custom fount instance', function() {
		var host;
		before( function() {
			host = getHost()( {
				fount: { fake: true }
			} );
		} );

		it( 'should use provided fount instance', function() {
			host.fount.should.eql( { fake: true } );
		} );
	} );

	describe( 'with custom metronic instance', function() {
		var host;
		before( function() {
			host = getHost()( {
				metrics: { fake: true, instrument: true, meter: _.noop }
			} );
		} );

		it( 'should use provided metronic instance', function() {
			host.metrics.fake.should.equal( true );
		} );
	} );

	describe( 'with metronic configuration', function() {
		var host;
		before( function() {
			host = getHost()( {
				metrics: { fake: true }
			} );
		} );

		it( 'should use provided metronic instance', function() {
			expect( host.metrics.fake ).to.be.undefined;
		} );
	} );

	describe( 'with log configuration', function() {
		var host;
		before( function() {
			host = getHost()( {
				logging: { fake: true }
			} );
		} );

		it( 'should use log configuration', function() {
			log.config.should.eql( { fake: true } );
		} );
	} );

	describe( 'with authProvider object', function() {
		var host, auth;

		before( function() {
			auth = { fake: true };
			host = getHost()( {}, auth );
		} );

		it( 'should set the auth property on the host', function() {
			host.auth.should.equal( auth );
		} );
	} );

	describe( 'with authProvider promise', function() {
		var host, auth, resources, subscription;

		before( function( done ) {
			auth = { fake: true };
			host = getHost()( {}, when.resolve( auth ) );
			subscription = host.onResources( function( list ) {
				resources = list;
				done();
			} );
		} );

		it( 'should set the auth property on the host', function() {
			host.auth.should.equal( auth );
		} );

		after( function() {
			subscription.unsubscribe();
		} );
	} );

	describe( 'with noOptions', function() {
		var host;
		before( function() {
			host = getHost()( {
				noOptions: true
			} );
		} );

		it( 'should use provided metronic instance', function() {
			http.middlewares.should.eql( [] );
		} );
	} );
} );
