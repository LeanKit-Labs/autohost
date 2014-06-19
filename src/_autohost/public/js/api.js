define([ 'jquery', 'postal' ],
	function( $, postal ) {
		var channel = postal.channel( 'api' ),
			prefix = '/api';

		$.ajax( {
			url: '/api',
			method: 'OPTIONS',
			success: function( data ) {
				prefix = data.prefix;
			}
		} );

		return {
			getResources: function() {
				$.ajax( {
					url: prefix +'/_autohost/resource',
					dataType: 'json',
					method: 'GET',
					success: function( data ) {
						channel.publish( 'resources', { value: data } );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'resources', { failed: true, error: err } );
					}
				} );
			},
			getUsers: function() {
				$.ajax( {
					url: prefix +'/_autohost/user',
					dataType: 'json',
					method: 'GET',
					success: function( data ) {
						channel.publish( 'user.list', { value: data } );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'user.list', { failed: true, error: err } );
					}
				} );
			},
			getRoles: function() {
				$.ajax( {
					url: prefix +'/_autohost/role',
					dataType: 'json',
					method: 'GET',
					success: function( data ) {
						channel.publish( 'role.list', { value: data } );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'role.list', { failed: true, error: err } );
					}
				} );
			},
			getActions: function() {
				$.ajax( {
					url: prefix +'/_autohost/action',
					dataType: 'json',
					method: 'GET',
					success: function( data ) {
						channel.publish( 'action.list', { value: data } );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'action.list', { failed: true, error: err } );
					}
				} );
			},
			addRole: function( role ) {
				$.ajax( {
					url: prefix +'/_autohost/role/' + role,
					dataType: 'text',
					method: 'POST',
					success: function( data ) {
						channel.publish( 'role.added', { value: role } );
					},
					error: function( xhr, data, err ) {
						console.log( data, err );
						channel.publish( 'role.added', { failed: true, error: err } );
					}
				} );
			},
			removeRole: function( role ) {
				$.ajax( {
					url: prefix +'/_autohost/role/' + role,
					dataType: 'text',
					method: 'DELETE',
					success: function( data ) {
						channel.publish( 'role.removed', { value: role } );
					},
					error: function( xhr, data, err ) {
						console.log( data, err );
						channel.publish( 'role.removed', { failed: true, error: err } );
					}
				} );
			},
			createUser: function( user, password ) {
				$.ajax( {
					url: prefix +'/_autohost/user/' + user,
					dataType: 'json',
					method: 'POST',
					data: { password: password },
					success: function( data ) {
						channel.publish( 'user.created', { value: user } );
					},
					error: function( xhr, data, err ) {
						console.log( data, err );
						channel.publish( 'user.created', { failed: true, error: err } );
					}
				} );
			},
			enableUser: function( user ) {
				$.ajax( {
					url: prefix +'/_autohost/user/' + user,
					dataType: 'text',
					method: 'PUT',
					success: function( data ) {
						channel.publish( 'user.enabled', { value: user } );
					},
					error: function( xhr, data, err ) {
						console.log( data, err );
						channel.publish( 'user.enabled', { failed: true, error: err } );
					}
				} );
			},
			disableUser: function( user ) {
				$.ajax( {
					url: prefix +'/_autohost/user/' + user,
					dataType: 'text',
					method: 'DELETE',
					success: function( data ) {
						channel.publish( 'user.disabled', { value: user } );
					},
					error: function( xhr, data, err ) {
						console.log( data, err );
						channel.publish( 'user.disabled', { failed: true, error: err } );
					}
				} );
			},
			setActionRoles: function( action, roles ) {
				$.ajax( {
					url: prefix +'/_autohost/action/' + action + '/role',
					dataType: 'json',
					data: { roles: roles },
					method: 'PUT',
					success: function( data ) {
						channel.publish( 'action.roles.set', { 
							value: { action: action, roles: roles } 
						} );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'action.roles.set', { 
							failed: true, 
							error: err, 
							value: { action: action, roles: roles } 
						} );
					}
				} );
			},
			addActionRoles: function( action, roles ) {
				$.ajax( {
					url: prefix +'/_autohost/action/' + action + '/role',
					dataType: 'json',
					data: { roles: roles },
					method: 'PATCH',
					success: function( data ) {
						channel.publish( 'action.roles.added', { 
							value: { action: action, roles: roles } 
						} );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'action.roles.added', { 
							failed: true, 
							error: err, 
							value: { action: action, roles: roles } 
						} );
					}
				} );
			},
			removeActionRoles: function( action, roles ) {
				$.ajax( {
					url: prefix +'/_autohost/action/' + action + '/role',
					dataType: 'json',
					data: { roles: roles },
					method: 'DELETE',
					success: function( data ) {
						channel.publish( 'action.roles.removed', { 
							value: { action: action, roles: roles } 
						} );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'action.roles.removed', { 
							failed: true, 
							error: err, 
							value: { action: action, roles: roles } 
						} );
					}
				} );
			},
			addUserRoles: function( user, roles ) {
				$.ajax( {
					url: prefix +'/_autohost/user/' + user + '/role',
					dataType: 'json',
					data: { roles: roles },
					method: 'PATCH',
					success: function( data ) {
						channel.publish( 'user.roles.added', { 
							value: { user: user, roles: roles } 
						} );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'user.roles.added', { 
							failed: true, 
							error: err, 
							value: { user: user, roles: roles } 
						} );
					}
				} );
			},
			removeUserRoles: function( user, roles ) {
				$.ajax( {
					url: prefix +'/_autohost/user/' + user + '/role',
					dataType: 'json',
					data: { roles: roles },
					method: 'DELETE',
					success: function( data ) {
						channel.publish( 'user.roles.removed', { 
							value: { user: user, roles: roles } 
						} );
					},
					error: function( xhr, data, err ) {
						channel.publish( 'user.roles.removed', { 
							failed: true, 
							error: err, 
							value: { user: user, roles: roles } 
						} );
					}
				} );
			}
		};
	}
);