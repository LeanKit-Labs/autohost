define( 
	[ 'lodash', 'api', 'when' ],
function( _, api, when ) {
	
	var state = [];

	function failed( err ) {
		return { failed: err };
	}

	function addRole( userName, role ) {
		var user = _.where( state, { name: userName } )[ 0 ];
		return api.users.addRole( userName, role )
			.then( null, failed )
			.then( function() {
				user.roles.push( role );
				return { success: { name: userName, role: role } };
			} );
	}

	function changePassword( userName, password ) {
		var user = _.where( state, { name: userName } )[ 0 ];
		return api.users.changePassword( userName, password )
			.then( null, failed )
			.then( function() {
				user.password = password;
				return { success: { name: userName } };
			} );
	}

	function createToken() {
		return api.users.createToken()
			.then( null, failed )
			.then( function( data ) {
				return { success: data };
			} );
	}

	function createUser( userName, password ) {
		return api.users.create( userName, password )
			.then( null, failed )
			.then( function() {
				state.push( { name: userName, password: password, roles: [], tokens: [] } );
				return { success: { name: userName } };
			} );
	}

	function deleteToken( token ) {
		return api.users.deleteToken( token )
			.then( null, failed )
			.then( function() {
				return { success: true };
			} );
	}

	function disableUser( userName ) {
		var user = _.where( state, { name: userName } )[ 0 ];
		return api.users.disable( userName )
			.then( null, failed )
			.then( function() {
				user.disabled = true;
				return { success: { name: userName, disabled: true } };
			} );
	}

	function enableUser( userName ) {
		var user = _.where( state, { name: userName } )[ 0 ];
		return api.users.enable( userName )
			.then( null, failed )
			.then( function() {
				user.disabled = false;
				return { success: { name: userName, disabled: false } };
			} );
	}

	function getList() {
		if( _.isEmpty( state ) ) { 
			return api.users.get()
				.then( function( list ) {
					state = list;
					return { success: list };
				} );
		} else {
			return when( state );
		}	
	}

	function removeRole( userName, role ) {
		var user = _.where( state, { name: userName } )[ 0 ];
		return api.users.removeRole( userName, role )
			.then( null, failed )
			.then( function() {
				user.roles = _.without( user.roles, role );
				return { success: { name: userName, role: role } };
			} );
	}

	return {
		createToken: createToken,
		addRole: addRole,
		changePassword: changePassword,
		create: createUser,
		deleteToken: deleteToken,
		disable: disableUser,
		enable: enableUser,
		get: getList,
		removeRole: removeRole
	};
} );