var fs = require( 'fs' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	util = require( 'util' ),
	os = require( 'os' );

module.exports = function( host ) {
	return {
		name: '_autohost',
		resources: 'public',
		actions: [
			{
				alias: 'api',
				verb: 'get',
				topic: 'api',
				path: '',
				handle: function( envelope) {
					envelope.reply( { data: host.resources['_autohost'].routes } );
				}
			},
			{
				alias: 'resources',
				verb: 'get',
				topic: 'resource.list',
				path: 'resource',
				handle: function( envelope ) {
					envelope.reply( { data: host.resources } );
				}
			},
			{
				alias: 'actions',
				verb: 'get',
				topic: 'actions.list',
				path: 'action',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.getActionList ) {
						host.authorizer.getActionList(512)
							.then( null, function( err ) {
								console.log( err );
							} )
							.then( function ( list ) {
								envelope.reply( { data: list } );
							} );
					} else {
						envelope.reply( { data: host.actions } );	
					}
					
				}
			},
			{
				alias: 'connected-sockets',
				verb: 'get',
				topic: 'socket.count',
				path: 'sockets',
				handle: function( envelope ) {
					envelope.reply( { data: { connected: host.clients.length } } );
				}
			},
			{
				alias: 'list-users',
				verb: 'get',
				topic: 'user.list',
				path: 'user',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.getUserList ) {
						host.authorizer.getUserList(512, function( err, users ) {
							if( err ) {
								envelope.reply( { data: err, statusCode: 500 } );
							} else {
								users = _.map( users, function( user ) {
									return _.omit( user, '_indices', 'pass', 'password' );
								} );
								envelope.reply( { data: users } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'list-roles',
				verb: 'get',
				topic: 'role.list',
				path: 'role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.getRoleList ) {
						host.authorizer.getRoleList(512, function( err, roles ) {
							if( err ) {
								envelope.reply( { data: err, statusCode: 500 } );
							} else {
								envelope.reply( { data: roles } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'list-user-roles',
				verb: 'get',
				topic: 'user.role.list',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.getUserRoles ) {
						var user = envelope.data.user;
						host.authorizer.getUserRoles( user, function( err, roles ) {
							if( err ) {
								envelope.reply( { data: err, statusCode: 500 } );
							} else {
								envelope.reply( { data: { user: user, roles: roles } } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'list-action-roles',
				verb: 'get',
				topic: 'action.role.list',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.getRolesFor ) {
						var action = envelope.data.action;
						host.authorizer.getRolesFor( action, function( err, roles ) {
							if( err ) {
								envelope.reply( { data: err, statusCode: 500 } );
							} else {
								envelope.reply( { data: { action: action, roles: roles } } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'set-action-roles',
				verb: 'put',
				topic: 'set.action.roles',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.setActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.authorizer.setActionRoles( action, roles, function( err ) {
							if( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} else {
								envelope.reply( { data: "ok" } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'add-action-roles',
				verb: 'patch',
				topic: 'add.action.roles',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.addActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.authorizer.addActionRoles( action, roles, function( err ) {
							if( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} else {
								envelope.reply( { data: { result: "ok" } } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'remove-action-roles',
				verb: 'delete',
				topic: 'remove.action.roles',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.removeActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.authorizer.removeActionRoles( action, roles, function( err ) {
							if( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} else {
								envelope.reply( { data: { result: "ok" } } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'set-user-roles',
				verb: 'put',
				topic: 'set.user.roles',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.setUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.authorizer.setUserRoles( user, roles, function( err ) {
							if( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} else {
								envelope.reply( { data: { result: "ok" } } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'add-user-roles',
				verb: 'patch',
				topic: 'add.user.roles',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.addUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.authorizer.addUserRoles( user, roles, function( err ) {
							if( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} else {
								envelope.reply( { data: { result: "ok" } } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'remove-user-roles',
				verb: 'delete',
				topic: 'remove.user.roles',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.removeUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.authorizer.removeUserRoles( user, roles, function( err ) {
							if( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} else {
								envelope.reply( { data: "ok" } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'add-role',
				verb: 'post',
				topic: 'add.role',
				path: 'role/:role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.addRole ) {
						var role = envelope.data.role;
						host.authorizer.addRole( role, function( err ) {
							if( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} else {
								envelope.reply( { data: "ok" } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				alias: 'remove-role',
				verb: 'delete',
				topic: 'remove.role',
				path: 'role/:role',
				handle: function( envelope ) {
					if( host.authorizer && host.authorizer.removeRole ) {
						var role = envelope.data.role;
						host.authorizer.removeRole( role, function( err ) {
							if( err ) {
								envelope.reply( { data: { error: err }, statusCode: 500 } );
							} else {
								envelope.reply( { data: "ok" } );
							}
						} );
					} else {
						envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
					}
				}
			},
			{
				'alias': 'create-user',
				'verb': 'post',
				'topic': 'create.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.authenticator && host.authenticator.create ) {
						var user = envelope.data.userName,
							pass = envelope.data.password;
						host.authenticator.create( user, pass )
							.then( null, function( err ) {
								envelope.reply( { data: { result: 'Could not create user "' + user + '"', error: err }, statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: { result: 'User created successfully' } } );
							} );
					} else {
						envelope.reply( { data: { result: "Operation not supported by authentication provider" }, statusCode: 404 } );
					}
				}
			},
			{
				'alias': 'enable-user',
				'verb': 'put',
				'topic': 'enable.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.authenticator && host.authenticator.enable ) {
						var user = envelope.data.userName;
						host.authenticator.enable( user )
							.then( null, function( err ) {
								envelope.reply( { data: 'Could not enable user "' + user + '"', statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: 'User enabled successfully' } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authentication provider", statusCode: 404 } );
					}	
				}
			},
			{
				'alias': 'disable-user',
				'verb': 'delete',
				'topic': 'disable.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.authenticator && host.authenticator.disable ) {
						var user = envelope.data.userName;
						host.authenticator.disable( user )
							.then( null, function( err ) {
								envelope.reply( { data: 'Could not disable user "' + user + '"', statusCode: 500 } );
							} )
							.then( function() {
								envelope.reply( { data: 'User disabled successfully' } );
							} );
					} else {
						envelope.reply( { data: "Operation not supported by authentication provider", statusCode: 404 } );
					}
				}
			},
			{
				'alias': 'metrics',
				'verb': 'get',
				'topic': 'get.metrics',
				'path': 'metrics',
				handle: function( envelope ) {
					host.metrics.getMetrics( function( metrics ) {
						envelope.reply( { data: metrics } );
					} );
				}
			}
		]
	};
};