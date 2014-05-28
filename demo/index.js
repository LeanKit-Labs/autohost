var passport = require( 'passport' );
var host = require( '../src/autohost.js' )();
var _ = require( 'lodash' );
var config = require( 'configya' )();
require( 'autohost-riak-auth' )( host, config )
	.then( function( provider ) {
		console.log( provider );
		host.init( {
			port: 4041,
			resources: './demo/resource',
			socketIO: true,
			websockets: true,
			origin: 'console'
		} );

		host.on( 'socket.client.connected', function( event ) {
			var socket = event.socket;
		} );
	} );