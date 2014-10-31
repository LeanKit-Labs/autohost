var _ = require( 'lodash' );
var uuid = require( 'node-uuid' );

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
	envelope.reply( { data: 'Operation not supported by authorization strategy', statusCode: 404 } );
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
		actions: {
			api: {
				method: 'get',
				topic: 'api',
				url: '',
				handle: function( envelope) {
					envelope.reply( { data: host.meta._autohost.routes } );
				}
			},
			resources: {
				method: 'get',
				topic: 'resource.list',
				url: '/resource',
				handle: function( envelope ) {
					envelope.reply( { data: host.meta } );
				}
			},
			'actions': {
				method: 'get',
				topic: 'actions.list',
				url: '/action',
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
			'connected-sockets': {
				method: 'get',
				topic: 'socket.count',
				url: '/sockets',
				handle: function( envelope ) {
					envelope.reply( { data: { connected: host.socket.clients.length } } );
				}
			},
			'list-users': {
				method: 'get',
				topic: 'user.list',
				url: '/user',
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
			'list-roles': {
				method: 'get',
				topic: 'role.list',
				url: '/role',
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
			'list-user-roles': {
				method: 'get',
				topic: 'user.role.list',
				url: '/user/:user/role',
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
			'list-action-roles': {
				method: 'get',
				topic: 'action.role.list',
				url: '/action/:action/role',
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
			'add-action-roles': {
				method: 'patch',
				topic: 'add.action.roles',
				url: '/action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.changeActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.auth.changeActionRoles( action, roles, 'add' )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { result: 'ok' } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			'remove-action-roles': {
				method: 'delete',
				topic: 'remove.action.roles',
				url: '/action/:action/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.changeActionRoles ) {
						var action = envelope.data.action;
						var roles = envelope.data.roles;
						host.auth.changeActionRoles( action, roles, 'remove' )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { result: 'ok' } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			'add-user-roles': {
				method: 'patch',
				topic: 'add.user.roles',
				url: '/user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.changeUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.auth.changeUserRoles( user, roles, 'add' )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { result: 'ok' } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			'remove-user-roles': {
				method: 'delete',
				topic: 'remove.user.roles',
				url: '/user/:user/role',
				handle: function( envelope ) {
					if( host.auth && host.auth.changeUserRoles ) {
						var user = envelope.data.user;
						var roles = envelope.data.roles;
						host.auth.changeUserRoles( user, roles, 'remove' )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: 'ok' } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			'add-role': {
				method: 'post',
				topic: 'add.role',
				url: '/role/:role',
				handle: function( envelope ) {
					if( host.auth && host.auth.createRole ) {
						var role = envelope.data.role;
						host.auth.createRole( role )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: 'ok' } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			'remove-role': {
				method: 'delete',
				topic: 'remove.role',
				url: '/role/:role',
				handle: function( envelope ) {
					if( host.auth && host.auth.deleteRole ) {
						var role = envelope.data.role;
						host.auth.deleteRole( role )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: 'ok' } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			'create-user': {
				method: 'post',
				topic: 'create.user',
				url: '/user/:userName',
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
			'change-password': {
				method: 'patch',
				topic: 'change.password',
				url: '/user/:userName',
				handle: function( envelope ) {
					if( host.auth && host.auth.createUser ) {
						var user = envelope.data.userName,
							pass = envelope.data.password;
						host.auth.changePassword( user, pass )
							.then( null, fivehundred( envelope ) )
							.then( function() {
								envelope.reply( { data: { result: 'User password changed successfully' } } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			'create-token': {
				method: 'post',
				topic: 'create.token',
				url: '/token',
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
			'destroy-token': {
				method: 'delete',
				topic: 'delete.token',
				url: '/token/:token',
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
			'list-tokens': {
				method: 'get',
				topic: 'list.tokens',
				url: '/token/',
				handle: function( envelope ) {
					if( host.auth && host.auth.getTokens ) {
						var user = envelope.user.name;
						host.auth.getTokens( user )
							.then( null, fivehundred( envelope ) )
							.then( function(tokens) {
								envelope.reply( { data: tokens } );
							} );
					} else {
						unsupported( envelope );
					}
				}
			},
			'enable-user': {
				method: 'put',
				topic: 'enable.user',
				url: '/user/:userName',
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
			'disable-user': {
				method: 'delete',
				topic: 'disable.user',
				url: '/user/:userName',
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
			'metrics': {
				method: 'get',
				topic: 'get.metrics',
				url: '/metrics',
				handle: function( envelope ) {
					host.metrics.getMetrics( function( metrics ) {
						envelope.reply( { data: metrics } );
					} );
				}
			}
		}
	};
};