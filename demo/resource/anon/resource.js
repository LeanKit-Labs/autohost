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
			}
		]
	}	
};