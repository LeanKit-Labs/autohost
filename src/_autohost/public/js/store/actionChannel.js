define(
	[ 'postal' ],
function( postal ) {
	var channel = postal.channel( 'actions' );
	return {
		addRole: function( action, role ) {
			channel.publish( 'role.add', { action: action, role: role } );
		},
		get: function() {
			channel.publish( 'get', {} );
		},
		onList: function( cb ) {
			return channel.subscribe( 'list', cb );
		},
		onRoleAdded: function( cb ) {
			return channel.subscribe( 'role.added', cb );
		},
		onRoleRemoved: function( cb ) {
			return channel.subscribe( 'role.removed', cb );
		},
		removeRole: function( action, role ) {
			channel.publish( 'role.remove', { action: action, role: role } );
		}
	};
} );