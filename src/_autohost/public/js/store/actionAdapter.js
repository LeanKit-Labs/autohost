define( 
	[ 'postal', 'actions' ],
function( postal, actions ) {
	var channel = postal.channel( 'actions' );

	channel.subscribe( 'get', function() {
		actions.get()
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'list.failed', result.failed );
				} else {
					channel.publish( 'list', result.success );
				}
			} );
	} );

	channel.subscribe( 'role.add', function( message ) {
		actions.addRole( message.action, message.role )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'add.failed', result.failed );
				} else {
					channel.publish( 'role.added', result.success );
				}
			} );
	} );

	channel.subscribe( 'role.remove', function( message ) {
		actions.removeRole( message.action, message.role )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'remove.failed', result.failed );
				} else {
					channel.publish( 'role.removed', result.success );
				}
			} );
	} );

 } );