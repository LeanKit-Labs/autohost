module.exports = function() {
	return {
		name: 'app',
		resources: 'public',
		actions: {
			echo: {
				method: 'post',
				topic: 'echo',
				url: '/echo',
				handle: function( envelope ) {
					console.log( 'got', envelope.data );
					envelope.reply( { data: envelope.data } );
				}
			},
			'get-session': {
				method: 'get',
				url: '/session',
				handle: function( envelope ) {
					envelope.reply( { data: envelope.session } );
				}
			},
			'add-session': {
				method: 'put',
				url: '/session',
				handle: function( envelope ) {
					envelope.session[ envelope.data.key ] = envelope.data.value;
					envelope.reply( { data: 'COOL BEANS!' } );
				}
			}
		}
	};
};