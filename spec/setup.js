var chai = require( 'chai' );
chai.use( require( 'chai-as-promised' ) );
global.should = chai.should();
global.expect = chai.expect;
var _ = global._ = require( 'lodash' );
global.when = require( 'when' );
global.lift = require( 'when/node' ).lift;
global.seq = require( 'when/sequence' );
global.fs = require( 'fs' );


function transformResponse() {
	var props = Array.prototype.slice.call( arguments, 0 );
	return function( resp ) {
		resp = _.isArray( resp ) ? resp[ 0 ] : resp;
		var obj = {};
		if ( _.contains( props, 'body' ) ) {
			obj.body = resp.body;
		}
		if ( _.contains( props, 'type' ) ) {
			obj.type = resp.headers[ 'content-type' ];
		}
		if ( _.contains( props, 'testHeader' ) ) {
			obj.header = resp.headers[ 'test-header' ];
		}
		if ( _.contains( props, 'setCookie' ) ) {
			obj.cookie = resp.headers[ 'set-cookie' ][ 0 ];
		}
		if ( _.contains( props, 'statusCode' ) ) {
			obj.statusCode = resp.statusCode;
		}
		return obj;
	};
}

function onError() {
	return {};
}

global.transformResponse = transformResponse;
global.onError = onError;
