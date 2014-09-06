define( 
	[ 'postal', 'roles' ],
function( postal, roles ) {
	var channel = postal.channel( 'roles' );

	channel.subscribe( 'get', function() {
		roles.get()
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'list.failed', result.failed );
				} else {
					channel.publish( 'list', result.success );
				}
			} );
	} );

	channel.subscribe( 'add', function( message ) {
		roles.add( message.name )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'add.failed', result.failed );
				} else {
					channel.publish( 'added', result.success );
				}
			} );
	} );

	channel.subscribe( 'remove', function( message ) {
		roles.remove( message.name )
			.then( function( result ) {
				if( result.failed ) {
					channel.publish( 'remove.failed', result.failed );
				} else {
					channel.publish( 'removed', result.success );
				}
			} );
	} );

 } );