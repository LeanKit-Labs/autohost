"use strict";

const path = require( "path" );
const autohost = require( path.resolve( __dirname, "../src/index" ) );
const host = autohost( {
	resources: path.resolve( __dirname, "./resource" ),
	static: path.resolve( __dirname, "./public" )
} );

host.start();
