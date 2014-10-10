module.exports = function() {
	return {
		name: 'app',
		resources: 'public',
		actions: [
			{
				alias: 'echo',
				verb: 'post',
				topic: 'echo',
				path: '/echo',
				handle: function( envelope ) {
					console.log( 'got', envelope.data );
					envelope.reply( { data: envelope.data } );
				}
			},
			{
				alias: 'get-session',
				verb: 'get',
				path: '/session',
				handle: function( envelope ) {
					envelope.reply( { data: envelope.session } );
				}
			},
			{
				alias: 'add-session',
				verb: 'put',
				path: '/session',
				handle: function( envelope ) {
					envelope.session[ envelope.data.key ] = envelope.data.value;
					envelope.reply( { data: 'COOL BEANS!' } );
				}
			}
		]
	};
};