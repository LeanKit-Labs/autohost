define( 
	[ 'postal', 'users' ],
function( postal, users ) {
	var channel = postal.channel( 'users' );

	channel.subscribe( 'create', function( message ) {
		users.create( message.name, message.password )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'create.failed', result.failed );
				} else {
					channel.publish( 'created', result.success );
				}
			} );
	} );

	channel.subscribe( 'disable', function( message ) {
		users.disable( message.name )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'disable.failed', result.failed );
				} else {
					channel.publish( 'disabled', result.success );
				}
			} );
	} );

	channel.subscribe( 'enable', function( message ) {
		users.enable( message.name )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'enable.failed', result.failed );
				} else {
					channel.publish( 'enabled', result.success );
				}
			} );
	} );

	channel.subscribe( 'get', function() {
		users.get()
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'list.failed', result.failed );
				} else {
					channel.publish( 'list', result.success );
				}
			} );
	} );

	channel.subscribe( 'password.change', function( message ) {
		users.changePassword( message.name, message.password )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'password.failed', result.failed );
				} else {
					channel.publish( 'password.changed', result.success );
				}
			} );
	} );

	channel.subscribe( 'role.add', function( message ) {
		users.addRole( message.name, message.role )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'add.failed', result.failed );
				} else {
					channel.publish( 'role.added', result.success );
				}
			} );
	} );

	channel.subscribe( 'role.remove', function( message ) {
		users.removeRole( message.name, message.role )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'remove.failed', result.failed );
				} else {
					channel.publish( 'role.removed', result.success );
				}
			} );
	} );

	channel.subscribe( 'token.create', function() {
		users.createToken()
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'token.failed', result.failed );
				} else {
					channel.publish( 'token.created', result.success );
				}
			} );
	} );

	channel.subscribe( 'token.delete', function() {
		users.deleteToken()
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'token.failed', result.failed );
				} else {
					channel.publish( 'token.deleted', result.success );
				}
			} );
	} );

 } );