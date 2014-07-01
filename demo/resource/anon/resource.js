var request = require( 'request' );

module.exports = function() {
	return {
		name: 'anon',
		resources: 'public',
		actions: [
			{
				verb: 'get',
				topic: 'chat',
				alias: 'chat',
				handle: function( envelope ) {
					envelope.reply( 200, 'Everything is awesome!' );
				}
			},
			{
				verb: 'all',
				topic: 'google',
				alias: 'google',
				path: '/google',
				handle: function( envelope ) {
					try {
					request.get( { url: 'http://www.google.com' } )
							.pipe( envelope.responseStream );
					} catch( e ) {
						console.log( e.stack );
					}
				}
			}
		]
	}	
};