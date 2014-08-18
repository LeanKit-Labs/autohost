define(
	[ 'postal' ],
function( postal ) {
	var channel = postal.channel( 'users' );
	return {
		addRole: function( userName, role ) {
			channel.publish( 'role.add', { name: userName, role: role } );
		},
		changePassword: function( userName, password ) {
			channel.publish( 'password.change', { name: userName, password: password} );
		},
		create: function( userName, password ) {
			channel.publish( 'create', { name: userName, password: password} );
		},
		createToken: function() {
			channel.publish( 'token.create', {} );
		},
		deleteToken: function() {
			channel.publish( 'token.delete', {} );
		},
		disable: function( userName ) {
			channel.publish( 'disable', { name: userName } );	
		},
		enable: function( userName ) {
			channel.publish( 'enable', { name: userName } );	
		},
		get: function() {
			channel.publish( 'get', {} );
		},
		onCreated: function( cb ) {
			return channel.subscribe( 'created', cb );
		},
		onDisabled: function( cb ) {
			return channel.subscribe( 'disabled', cb );
		},
		onEnabled: function( cb ) {
			return channel.subscribe( 'enabled', cb );
		},
		onPasswordChanged: function( cb ) {
			return channel.subscribe( 'password.changed', cb );
		},
		onTokenCreated: function( cb ) {
			return channel.subscribe( 'token.created', cb );
		},
		onTokenDeleted: function( cb ) {
			return channel.subscribe( 'token.deleted', cb );
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
		removeRole: function( userName, role ) {
			channel.publish( 'role.remove', { name: userName, role: role } );
		}
	};
} );