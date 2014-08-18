define([ 'jquery', 'when' ],
	function( $, when ) {
		var prefix = '/api';

		$.ajax( {
			url: '/api',
			method: 'OPTIONS',
			success: function( data ) {
				prefix = data.prefix;
			}
		} );

		function onFail( deferred ) {
			return function( xhr, data, err ) {
				deferred.reject( {
					xhr: xhr,
					data: data,
					err: err
				} );
			};
		}

		function send( url, method, deferred, data ) {
			if( data ) {
				$.ajax( {
					url: url,
					dataType: 'json',
					contentType: 'application/json',
					data: JSON.stringify( data ),
					method: method,
					success: deferred.resolve,
					error: onFail( deferred )
				} );
			} else {
				$.ajax( {
					url: url,
					dataType: 'json',
					method: method,
					success: deferred.resolve,
					error: onFail( deferred )
				} );
			}
		}

		function get( url ) {
			var deferred = when.defer(); 
			send( url, 'get', deferred );
			return deferred.promise;
		}

		function del( url, data ) {
			var deferred = when.defer(); 
			send( url, 'delete', deferred, data );
			return deferred.promise;
		}

		function put( url, data ) {
			var deferred = when.defer(); 
			send( url, 'put', deferred, data );
			return deferred.promise;
		}

		function post( url, data ) {
			var deferred = when.defer(); 
			send( url, 'post', deferred, data );
			return deferred.promise;
		}

		function patch( url, data ) {
			var deferred = when.defer(); 
			send( url, 'patch', deferred, data );
			return deferred.promise;
		}

		function getResources() {
			var url = prefix +'/_autohost/resource';
			return get( url );
		}

		function addActionRole( actionName, role ) {
			var url = prefix +'/_autohost/action/' + actionName + '/role';
			return patch( url, { roles: [ role ] } );
		}

		function getActions() {
			var url = prefix + '/_autohost/action';
			return get( url );
		}
		
		function removeActionRole( actionName, role ) {
			var url = prefix +'/_autohost/action/' + actionName + '/role';
			return del( url, { roles: [ role ] } );
		}

		function addRole( role ) {
			var url = prefix +'/_autohost/role/' + role;
			return post( url );
		}

		function getRoles() {
			var url = prefix + '/_autohost/role';
			return get( url );
		}
		
		function removeRole( role ) {
			var url = prefix +'/_autohost/role/' + role;
			return del( url );
		}

		function addUserRole( userName, role ) {
			var url = prefix +'/_autohost/user/' + userName + '/role';
			return patch( url, { roles: [ role ] } );
		}

		function addUserToken() {
			var url = prefix +'/_autohost/token';
			return post( url );
		}

		function createUser( userName, password ) {
			var url = prefix +'/_autohost/user/' + userName;
			return post( url, { password: password } );
		}

		function changePassword( userName, password ) {
			var url = prefix +'/_autohost/user/' + userName;
			return patch( url, { password: password } );
		}

		function deleteUserToken( token ) { // jshint ignore:line
			var url = prefix +'/_autohost/token/' + token;
			return del( url );
		}

		function disableUser( userName ) {
			var url = prefix +'/_autohost/user/' + userName;
			return del( url );
		}

		function enableUser( userName ) {
			var url = prefix +'/_autohost/user/' + userName;
			return put( url );
		}

		function getUsers() {
			var url = prefix + '/_autohost/user';
			return get( url );
		}

		function removeUserRole( userName, role ) {
			var url = prefix +'/_autohost/user/' + userName + '/role';
			return del( url, { roles: [ role ] } );
		}

		return {
			getResources: getResources,
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