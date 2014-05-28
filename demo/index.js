var passport = require( 'passport' );
var host = require( '../src/autohost.js' )();
var _ = require( 'lodash' );
var config = require( 'configya' )();
require( 'autohost-riak-auth' )( host, config )
	.then( function() {
		host.init( { 
			port: 4041,
			resources: './demo/resource',
			socketIO: true,
			websockets: true,
			origin: 'console'
		} );

		host.on( 'socket.client.connected', function( event ) {
			var socket = event.socket;
		} );
	} );

//var BasicStrategy = require( 'passport-http' ).BasicStrategy;
// host.withPassportStrategy(
// 	new BasicStrategy({}, function( username, password, done ) {		
// 		if( username == 'anonymous' || ( username == 'admin' && password == 'admin' ) ) {
// 			done( null, {
// 				id: username,
// 				name: username 
// 			} );
// 		} else {
// 			done( null, false );
// 		}
// 	} ),
// 	passport.authenticate( 'basic', { session: false } ),
// 	/^[\/]anon.*/ );

// var sillyAuthProvider = {
// 	roles: [ 'onepercenter', 'superduper', 'poopadmiral', 'filthy_commoner' ],
// 	users: [ 'admin', 'anonymous' ],
// 	roleIndex: { 'admin': [ 'superduper', 'onepercenter' ], 'anonymous': [ 'filthy_commoner' ] },
// 	actionMap: { 
// 		'_autohost.resources': [ 'onepercenter' ],
// 		'anonymous.chat': [ 'onepercenter' ]
// 	},
// 	pathMap: {
// 		'^/_autohost/' : [ 'onepercenter' ]
// 	},
// 	actionList: function( list, done ) {
// 		this.actions = list;
// 		done();
// 	},
// 	getUserRoles: function( user, done ) {
// 		done( null, this.roleIndex[ user.name ] );
// 	},
// 	getRolesFor: function( action, done ) {
// 		if( this.actionMap[ action ] ) {
// 			done( null, this.actionMap[ action ] || [] );
// 		} else {
// 			var any = false;
// 			_.each( this.pathMap, function( roles, pattern ) {
// 				if( new RegExp( pattern ).test( action ) ) {
// 					any = true;
// 					done( null, roles );
// 				}
// 			} );
// 			if( !any ) {
// 				done( null, [] );
// 			}
// 		}
// 	},
// 	getUserList: function( done ) {
// 		done( null, this.users );
// 	},
// 	getRoleList: function( done ) {
// 		done( null, this.roles );
// 	},
// 	setActionRoles: function( action, roles, done ) {
// 		this.actionMap[ action ] = roles;
// 		done();
// 	},
// 	setUserRoles: function( user, roles, done ) {
// 		this.roleIndex[ user ] = roles;
// 		done();
// 	},
// 	addRole: function( role, done ) {
// 		this.roles.push( role );
// 		done();
// 	},
// 	removeRole: function( role, done ) {
// 		var index = this.roles.indexOf( role );
// 		this.roles.splice( index, 1 );
// 		done();
// 	}
// };

// host.withAuthorizationProvider( sillyAuthProvider );
