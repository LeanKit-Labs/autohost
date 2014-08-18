define( 
	[ 'lodash', 'api', 'when' ],
function( _, api, when ) {
	
	var state = {

	};

	function addRole( actionName, role ) {
		var parts = actionName.split( '.' );
		var resourceName = parts[ 0 ];
		var action = _.where( state[ resourceName ], { name: actionName } )[ 0 ];
		
		return api.actions.addRole( actionName, role )
			.then( null, function( e ) {
				return { failed: e };
			} )
			.then( function() {
				action.roles.push( role );
				return { success: { action: actionName, role: role } };
			} );
	}

	function removeRole( actionName, role ) {
		var parts = actionName.split( '.' );
		var resourceName = parts[ 0 ];
		var action = _.where( state[ resourceName ], { name: actionName } )[ 0 ];
		
		return api.actions.removeRole( actionName, role )
			.then( null, function( e ) {
				return { failed: e };
			} )
			.then( function() {
				action.roles = _.without( action.roles, role );
				return { success: { action: actionName, role: role } };
			} );
	}

	function getActions() {
		if( _.isEmpty( state ) ) { 
			return api.actions.get()
				.then( function( list ) {
					state = list;
					return { success: list };
				} );
		} else {
			return when( state );
		}		
	}

	function getResources() {
		return _.keys( state );
	}

	function getResourceActions( resource ) {
		return state[ resource ];
	}

	return {
		addRole: addRole,
		get: getActions,
		getResources: getResources,
		getResourceActions: getResourceActions,
		removeRole: removeRole
	};
} );