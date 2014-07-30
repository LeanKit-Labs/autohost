var fs = require( 'fs' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	rootApp = path.resolve( './demo/public/app' );

module.exports = function() {
	return {
		name: 'app',
		resources: 'public',
		actions: [
			{
				alias: 'list',
				verb: 'get',
				topic: 'list',
				path: '',
				handle: function( envelope ) {
					envelope.reply( { data: [ 'lol' ] } );
				}
			}
		]
	};
};