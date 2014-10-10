var Debug = require( 'debug' );

module.exports = function( namespace ) {
	var debug = Debug( namespace );

	debug['site'] = Debug( 'autohost:site');
	debug.site.log = console.error.bind( console );

	return debug;
}

