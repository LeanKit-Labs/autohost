module.exports = function() {
	return {
		name: 'anon',
		resources: 'public',
		actions: {
			login: {
				method: 'get',
				topic: 'login',
				url: '/auth',
				handle: function( envelope ) {
					envelope.reply( { data: 'Everything is awesome, ' + JSON.stringify( envelope.user ) } );
				}
			}
		}
	};
};