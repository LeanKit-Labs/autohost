All functions are expected to return a promise. There is no longer support for callbacks.

## Required to provide authentication / authorization in autohost

	authenticate: 		function( req, res, next ),
	checkPermission:	function( user, action )
	getRolesFor: 		function( actionName )
	getUserRoles: 		function( user name ) { return promise with role list }
	hasUsers: 			function() { return promise true/false }
	serializeUser: 		function( user, done ) { done( null, user ); }
	deserializeUser: 	function( user, done ) { done( null, user); }
	strategies: 		passport strategy array

## Required to provide support for autohost's auth dashboard

	createUser: function( username, password, token )
	setPassword: function( username, password )
	setToken: function( username, token )
	disableUser: function( username )
	enableUser: function( username )

	actionList: function( list ) // updates the action list in the store

	// arg 0 is either limit or continuation, continuation object is controlled by lib entirely
	getUserList: function() 
	getActionList: function()
	getRoleList: function()

	addActionRoles: function( action, roles )
	removeActionRoles: function( action, roles )

	addUserRoles: function( user, roles )
	removeUserRoles: function( user, roles )

	setActionRoles: function( action, roles )
	setUserRoles: function( user, roles )

	addRole: function( role )