define( 
	[ 'lodash', 'api', 'when' ],
function( _, api, when ) {
	
	var state = [];

	function addRole( role ) {
		return api.roles.add( role )
			.then( null, function( e ) {
				return { failed: e };
			} )
			.then( function() {
				state.push( role );
				return { success: { name: role } };
			} );
	}

	function removeRole( role ) {
		return api.roles.remove( role )
			.then( null, function( e ) {
				return { failed: e };
			} )
			.then( function() {
				state = _.without( state, role );
				return { success: { name: role } };
			} );
	}

	function getRoles() {
		if( _.isEmpty( state ) ) { 
			return api.roles.get()
				.then( function( list ) {
					state = list;
					return { success: list };
				} );
		} else {
			return when( state );
		}
	}

	return {
		add: addRole,
		get: getRoles,
		remove: removeRole
	};
} );