var path = require( "path" );
var autohost = require( path.resolve( __dirname, "../src/index" ) );
var host = autohost( {
	resources: path.resolve( __dirname, "./resource" ),
	static: path.resolve( __dirname, "./public" )
} );

host.start();
