var fs = require( 'fs' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	util = require( 'util' ),
	os = require( 'os' ),
	uuid = require( 'node-uuid' );

function getContinuation( envelope ) {
	var continuation = envelope.continuation || { sort: {} };
	if( envelope.data.page ) {
		continuation.page = envelope.data.page;
	}
	if( envelope.data.limit ) {
		continuation.limit = envelope.data.limit;
	}
	if( envelope.data.limit ) {
		if( envelope.data.asc ) {
			_.each( envelope.data.asc.split( ',' ), function( field ) {
				continuation.sort[ field ] = 1;
			} );
		}
		if( envelope.data.desc ) {
			_.each( envelope.data.desc.split( ',' ), function( field ) {
				continuation.sort[ field ] = -1;
			} );
		}
	}
	return continuation;
}

function unsupported( envelope ) {
	envelope.reply( { data: "Operation not supported by authorization strategy", statusCode: 404 } );
}

function fivehundred( envelope ) {
	return function( err ) {
		envelope.reply( { data: err, statusCode: 500 } );
	};
}

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
					envelope.reply( { data: host.meta[ '_autohost' ].routes } );
				}
			},
			{
				alias: 'resources',
				verb: 'get',
				topic: 'resource.list',
				path: 'resource',
				handle: function( envelope ) {
					envelope.reply( { data: host.meta } );
				}
			},
			{
				alias: 'actions',
				verb: 'get',
				topic: 'actions.list',
				path: 'action',
				handle: function( envelope ) {
					if( host.auth && host.auth.getActions ) {
						var continuation = getContinuation( envelope );
						host.auth.getActions( continuation )
							.then( null, fivehundred( envelope ) )
							.then( function ( list ) {
								envelope.reply( { data: _.groupBy( list, function( x ) { return x.resource; } ) } );
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
					envelope.reply( { data: { connected: host.socket.clients.length } } );
				}
			},
			{
				alias: 'list-users',
				verb: 'get',
				topic: 'user.list',
				path: 'user',
				handle: function( envelope ) {
					if( host.auth && host.auth.getUsers ) {
						var continuation = getContinuation( envelope );
						host.auth.getUsers( continuation )
							.then( null, fivehundred( envelope ) )
							.then( function( users ) {
								envelope.reply( { data: users } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'list-roles',
				verb: 'get',
				topic: 'role.list',
				path: 'role',
				handle: function( envelope ) {
					if( host.auth && host.auth.getRoles ) {
						var continuation = getContinuation( envelope );
						host.auth.getRoles( continuation )
							.then( null, fivehundred( envelope ) )
							.then( function( roles ) {
								envelope.reply( { data: roles } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'list-user-roles',
				verb: 'get',
				topic: 'user.role.list',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.getUserRoles ) {
						var user = envelope.data.user;
						host.auth.getUserRoles( user )
						 	.then( null, fivehundred( envelope ) )
							.then( function( roles ) {
								envelope.reply( { data: { user: user, roles: roles } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'list-action-roles',
				verb: 'get',
				topic: 'action.role.list',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.getActionRoles ) {
						var action = envelope.data.action;
						host.auth.getActionRoles( action )
							.then( null, fivehundred( envelope ) )
							.then( function( roles ) {
								envelope.reply( { data: { action: action, roles: roles } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'add-action-roles',
				verb: 'patch',
				topic: 'add.action.roles',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.changeActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.auth.changeActionRoles( action, roles, 'add' )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { result: "ok" } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'remove-action-roles',
				verb: 'delete',
				topic: 'remove.action.roles',
				path: 'action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.changeActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.auth.changeActionRoles( action, roles, 'remove' )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { result: "ok" } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'add-user-roles',
				verb: 'patch',
				topic: 'add.user.roles',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.changeUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.auth.changeUserRoles( user, roles, 'add' )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { result: "ok" } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'remove-user-roles',
				verb: 'delete',
				topic: 'remove.user.roles',
				path: 'user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.changeUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.auth.changeUserRoles( user, roles, 'remove' )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: "ok" } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'add-role',
				verb: 'post',
				topic: 'add.role',
				path: 'role/:role',
				handle: function( envelope ) {
					if( host.auth && host.auth.createRole ) {
						var role = envelope.data.role;
						host.auth.createRole( role )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: "ok" } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				alias: 'remove-role',
				verb: 'delete',
				topic: 'remove.role',
				path: 'role/:role',
				handle: function( envelope ) {
					if( host.auth && host.auth.deleteRole ) {
						var role = envelope.data.role;
						host.auth.deleteRole( role )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: "ok" } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				'alias': 'create-user',
				'verb': 'post',
				'topic': 'create.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.auth && host.auth.createUser ) {
						var user = envelope.data.userName,
							pass = envelope.data.password;
						host.auth.createUser( user, pass )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { result: 'User created successfully' } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				'alias': 'create-token',
				'verb': 'post',
				'topic': 'create.token',
				'path': 'token',
				handle: function( envelope ) {
					if( host.auth && host.auth.createToken ) {
						var user = envelope.user.name,
							token = uuid.v4();
						host.auth.createToken( user, token )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { token: token, result: 'New token added to your account' } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				'alias': 'destroy-token',
				'verb': 'delete',
				'topic': 'delete.token',
				'path': 'token/:token',
				handle: function( envelope ) {
					if( host.auth && host.auth.createToken ) {
						var user = envelope.user.name,
							token = envelope.data.token;
						host.auth.createToken( user, token )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { token: token, result: 'Token has been deleted from your account.' } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				'alias': 'list-tokens',
				'verb': 'get',
				'topic': 'list.tokens',
				'path': 'token/',
				handle: function( envelope ) {
					if( host.auth && host.auth.getTokens ) {
						var user = envelope.user.name;
						host.auth.getTokens( user )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: tokens } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			{
				'alias': 'enable-user',
				'verb': 'put',
				'topic': 'enable.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.auth && host.auth.enableUser ) {
						var user = envelope.data.userName;
						host.auth.enableUser( user )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: 'User enabled successfully' } );
							} );
					} else {
						unsupported( envelope );
					}	
				}
			},
			{
				'alias': 'disable-user',
				'verb': 'delete',
				'topic': 'disable.user',
				'path': 'user/:userName',
				handle: function( envelope ) {
					if( host.auth && host.auth.disableUser ) {
						var user = envelope.data.userName;
						host.auth.disableUser( user )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: 'User disabled successfully' } );
							} );
					} else {
						unsupported( envelope );
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