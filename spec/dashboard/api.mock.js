define([ 'jquery', 'when', 'lodash' ],
	function( $, when, _ ) {
		var state = {
			resouces: {

			},
			roles: [ 'guest', 'admin' ],
			users: [
				{
					name: 'one',
					roles: [],
					tokens: [],
					password: 'pass'
				}
			],
			actions: {
				thing: [
					{ 
						name: 'thing.view',
						resource: 'thing',
						roles: []
					},
					{ 
						name: 'thing.create',
						resource: 'thing',
						roles: []
					},
					{ 
						name: 'thing.update',
						resource: 'thing',
						roles: []
					},
					{ 
						name: 'thing.delete',
						resource: 'thing',
						roles: []
					}
				]
			}
		};

		function addActionRole( actionName, role ) {
			var parts = actionName.split( '.' );
			var resourceName = parts[ 0 ];
			var action = _.where( state.actions[ resourceName ], { name: actionName } )[ 0 ];
			action.roles.push( role );
			return when( true );
		}

		function getActions() {
			return when( state.actions );
		}
		
		function removeActionRole( actionName, role ) {
			var parts = actionName.split( '.' );
			var resourceName = parts[ 0 ];
			var action = _.where( state.actions[ resourceName ], { name: actionName } )[ 0 ];
			action.roles = _.without( action.roles, role );
			return when( true );
		}

		function addRole( role ) {
			state.roles.push( role );
			return when( true );
		}

		function getRoles() {
			return when( state.roles );
		}
		
		function removeRole( role ) {
			state.roles = _.without( state.roles, role );
			return when( true );
		}

		function addUserRole( userName, role ) {
			var user = _.where( state.users, { name: userName } )[ 0 ];
			user.roles.push( role );
			return when( true );
		}

		function addUserToken() {
			return when( 'token' );
		}

		function createUser( userName, password ) {
			state.users.push( { name: userName, password: password, roles: [], tokens: [] } );
			return when( true );
		}

		function changePassword( userName, password ) {
			var user = _.where( state.users, { name: userName } )[ 0 ];
			user.password = password;
			return when( true );
		}

		function deleteUserToken( userName, token ) { // jshint ignore:line
			return when( true );
		}

		function disableUser( userName ) {
			var user = _.where( state.users, { name: userName } )[ 0 ];
			user.disabled = true;
			return when( true );
		}

		function enableUser( userName ) {
			var user = _.where( state.users, { name: userName } )[ 0 ];
			user.disabled = false;
			return when( true );
		}

		function getUsers() {
			return when( state.users );
		}

		function removeUserRole( userName, role ) {
			var user = _.where( state.users, { name: userName } )[ 0 ];
			user.roles = _.without( user.roles, role );
			return when( true );
		}

		return {
			actions: {
				addRole: addActionRole,
				get: getActions,
				removeRole: removeActionRole
			},
			roles: {
				add: addRole,
				get: getRoles,
				remove: removeRole
			},
			users: {
				addRole: addUserRole,
				create: createUser,
				createToken: addUserToken,
				changePassword: changePassword,
				deleteToken: deleteUserToken,
				disable: disableUser,
				enable: enableUser,
				get: getUsers,
				removeRole: removeUserRole
			}
		};
	}
);