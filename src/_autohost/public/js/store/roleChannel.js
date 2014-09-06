define(
	[ 'postal' ],
function( postal ) {
	var channel = postal.channel( 'roles' );
	return {
		add: function( role ) {
			channel.publish( 'add', { name: role } );
		},
		get: function() {
			channel.publish( 'get', {} );
		},
		onList: function( cb ) {
			return channel.subscribe( 'list', cb );
		},
		onAdded: function( cb ) {
			return channel.subscribe( 'added', cb );
		},
		onRemoved: function( cb ) {
			return channel.subscribe( 'removed', cb );
		},
		remove: function( role ) {
			channel.publish( 'remove', { name: role } );
		}
	};
} );