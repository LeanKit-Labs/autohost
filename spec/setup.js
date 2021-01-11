var chai = require( 'chai' );
chai.use( require( 'chai-as-promised' ) );
global.should = chai.should();
global.expect = chai.expect;
var _ = global._ = require( 'lodash' );
global.when = require( 'when' );
global.lift = require( 'when/node' ).lift;
global.seq = require( 'when/sequence' );
global.fs = require( 'fs' );
global.path = require( 'path' );
global.sinon = require( 'sinon' );
global.proxyquire = require( 'proxyquire' ).noPreserveCache();
var sinonChai = require( 'sinon-chai' );
chai.use( sinonChai );
var logLib = require( "../src/log" );
var adapterPath = require.resolve( "./mockLogger.js" );
var mockAdapter = require( "./mockLogger.js" );
process.title = 'ahspec';

function transformResponse() {
	var props = Array.prototype.slice.call( arguments, 0 );
	return function( resp ) {
		resp = _.isArray( resp ) ? resp[ 0 ] : resp;
		var obj = {};
		if ( _.includes( props, 'body' ) ) {
			obj.body = resp.body;
		}
		if ( _.includes( props, 'type' ) ) {
			obj.type = resp.headers[ 'content-type' ];
		}
		if ( _.includes( props, 'cache' ) ) {
			obj.cache = resp.headers[ 'cache-control' ];
		}
		if ( _.includes( props, 'testHeader' ) ) {
			obj.header = resp.headers[ 'test-header' ];
		}
		if ( _.includes( props, 'setCookie' ) ) {
			obj.cookie = resp.headers[ 'set-cookie' ][ 0 ];
		}
		if ( _.includes( props, 'statusCode' ) ) {
			obj.statusCode = resp.statusCode;
		}
		return obj;
	};
}

function onError() {
	return {};
}

global.setupLog = function setupLog( ns, level ) {
	global.logAdapter = mockAdapter( ns );
	var adapters = {};
	adapters[ adapterPath ] = { level: level || 5 };
	var logFn = global.Log = logLib( {
		adapters: adapters
	} );
	return logFn( ns );
};

global.transformResponse = transformResponse;
global.onError = onError;

var _log = console.log;
console.log = function() {
	if ( typeof arguments[ 0 ] === 'string' && /^[a-zA-Z]/.test( arguments[ 0 ] ) ) {
		return; // swallow this message
	} else {
		_log.apply( console, arguments );
	}
};
