module.exports = function() {
	return {
		name: 'anon',
		resources: 'public',
		actions: [
			{
				verb: 'get',
				topic: 'login',
				alias: 'login',
				path: '/auth',
				handle: function( envelope ) {
					envelope.reply( { data: 'Everything is awesome, ' + JSON.stringify( envelope.user ) } );
				}
			}
		]
	};
};