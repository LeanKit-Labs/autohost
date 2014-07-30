var wrapper = {
	authenticate: authenticate,
	changeActionRoles: changeActionRoles,
	changePassword: changePassword,
	changeUserRoles: changeUserRoles,
	checkPermission: checkPermission,
	createRole: createRole,
	createUser: createUser,
	createToken: createToken,
	destroyToken: destroyToken,
	deserializeUser: deserializeUser,
	disableUser: disableUser,
	enableUser: enableUser,
	getActions: getActions,
	getActionRoles: getRolesFor,
	getRoles: getRoles,
	getUsers: getUsers,
	getUserRoles: getUserRoles,
	hasUsers: hasUsers,
	removeRole: removeRole,
	serializeUser: serializeUser,
	strategies = [],
	updateActions: updateActions,
};

function authenticate( req, res, next ) {}
function changeActionRoles( action, roles, op ) {}
function changePassword( userName, password ) {}
function changeUserRoles( action, roles, op ) {}
function checkPermission( user, action ) {}
function createRole( roleName ) {}
function createToken( userName ) {}
function destroyToken( userName, token ) {}
function disableUser( userName ) {}
function enableUser( userName ) {}
function getActions() {}
function getActionRoles( actionName ) {}
function getRoles() {}
function getUsers() {}
function getUserRoles( userName ) {}
function hasUsers() {}
function removeRole( roleName ) {}
function serializeUser( user, done ) { done( null, user ); }
function deserializeUser( user, done ) { done( null, user); }

module.exports = function() {
	return wrapper;
};