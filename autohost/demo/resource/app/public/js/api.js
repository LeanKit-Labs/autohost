define([ 'jquery', 'postal' ],
	function( $, postal ) {
		var channel = postal.channel( 'api' );
		return {
			getDownloads: function() {
				$.ajax( {
					url: '/api/app',
					dataType: 'json',
					method: 'GET',
					success: function( data ) {
						channel.publish( 'downloads', { value: data } );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'downloads', { failed: true, error: err } );
					}
				} );
			}
		};
	}
);