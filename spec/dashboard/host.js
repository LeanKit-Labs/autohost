var host = require( '../../src/index.js' );

host.init( {
	static: './src/_autohost/public',
	port: 4488
} );
host.http.static( '/spec', './spec/dashboard' );