# Autohost Auth Provider API
This document explains the how and what behind writing an autohost auth provider. Check out https://github.com/arobson/autohost-auth-shell to see a gutted provider that you might be able to use in rolling your own.

## Existing providers
 * [autohost-riak-auth](https://github.com/LeanKit-Labs/autohost-riak-auth)
 * [autohost-nedb-auth](https://github.com/LeanKit-Labs/autohost-nedb-auth)

## Data structures
Your backing store can have any logical schema you like, but records provided to autohost must conform to the follow formats (don't worry, they're very simple). All interactions autohost will have expect uniqueness to hold by a name property. This means that autohost doesn't care about record ids, it will ignore them; all API endpoints and logic will treat the name property as a unique identifier.

### User
The only properties *required* by autohost's user model are: name, roles, and disabled. Autohost provides api to create and manage tokens for API access. How autohost authenticates users is entirely under the auth provider's control.

```javascript
{
	name: 'username',
	disabled: false,
	roles: [ 'guest' ]
}
```

### Role
A role is simply a string. There is currently no other information required by autohost to work with roles. It only needs to store/retrieve them if you intend to use autohost's dashboard to manage permissions for your application.

### Action
Actions have three properties - name, resource and roles. Because autohost is the definitive source of actions, it doesn't make a lot of sense to assign additional metadata to this in an external store, but nothing's stopping you either.

```javascript
{
	name: 'resource.alias',
	resource: 'resource',
	roles: [ 'admin', 'manager' ]
}
```

	Note: the name of an action is a combination of the resource name and the alias property set in the resource file for a particular action.

### Accessing
Both the socket and request objects (and therefore envelopes in your resource's actions) will have the user object attached via a `user` property. This property should only ever contain the name, disabled flag and roles list. It is possible that a poorly written auth provider lib could expose any number of details and lead to undesired results. Use caution in implementing your auth provider and try to limit the information returned to only what autohost requires to function.

## Mandatory API
The follow methods are *required* by any auth provider library in order for autohost to function correctly. These functions will have a definite impact on the runtime performance of your service. Please consider the performance implications when building providers.

 * authenticate: function( req, res, next ) {} // called as middleware via Passport
 * checkPermission: function( user, action ) {} // return promised boolean to indicate if user can invoke action
 * deserializeUser: function( user, done ) {} // deserialize user record from session store
 * getActionRoles: function( actionname ) {} // return a promised array of the action's roles
 * getUserRoles: function( username ) {} // return a promised array of the user's roles
 * hasUsers: function() {} // return a promised boolean to indicate if any users exist in the system
 * initPassport: function( passport ) {} // initialize passport here - autohost passes in its instance
 * serializeUser: function( user, done ) {} // serialize user record for session store
 * strategies: [] // a list of the Passport strategies for use in authenticating requests and sockets
 * updateActions: function( set ) {} // called on start-up by 

### authenticate( req, res, next ) -> void
Called as part of the middleware stack via Passport. If you have multiple authentication strategies, this is where you would differentiate between them based on the content of the request itself.

```javascript
// Demonstration of differentiating between basic and token authentication based on
// the auth header.
// Note: the way this is written, in the abscence of any authorization header,
// the resulting challenge will always be basic.
function authenticate( req, res, next ) {
	var authorization = req.headers.authorization;
	if( /Token/i.test( authorization ) ) {
		tokenAuth( req, res, next );
	} else {
		basicAuth( req, res, next );
	}
}
```

### checkPermission( user, action ) -> promise( boolean )
User and action can be either the name of the entity OR a cached representation with the roles already loaded.
Should return true IF:
 * action's roles property is empty (no role is required to perform the action)
 * user's roles property contains a role also found in the action's roles property

Should return false IF:
 * none of the roles in the user's roles property were found in the non-empty action role's property
 * the user has been disabled (user.disabled === true)

```javascript
// inspects the arguments passed and determines whether or not to load the roles for either from a backing store
function checkPermission( user, action ) {
	var actionName = action.roles ? action.name : action,
		actionRoles = _.isEmpty( action.roles ) ? db.getActionRoles( actionName ) : action.roles,
		userName = user.name ? user.name : user,
		userRoles = _.isEmpty( user.roles ) ? db.getUserRoles( userName ) : user.roles;
	if( user.roles && user.disabled ) {
		userRoles = [];
	}
	return when.try( userCan, userRoles, actionRoles );
}

// takes the final lists of each and checks for either condition
function userCan( userRoles, actionRoles ) {
	return actionRoles.length == 0 || _.intersection( actionRoles, userRoles ).length > 0;
}
```

### deserializeUser( user, done ) -> void
The inverse of `serializeUser`. Called from passport in order to take a raw data format and get the user record. The done callback follows the typical Node ( error, result ) format.

```javascript
function deserializeUser( user, done ) { done( null, JSON.parse( user ) ); };
```

### getActionRoles( actionname ) -> promise( string array )
This takes the name of an action and returns a promise that should resolve to the list of roles for the action.

### getUserRoles( username ) -> promise( string array )
This takes the name of a user and returns a promise that should resolve to the list of roles for the user.

### hasUsers() -> promise( boolean )
Autohost will actually skip authentication middleware if no users exist in the database and assign the user record { name: 'anonymous', roles: [] } to all requests and sockets. This is to prevent weird situations where new services under development lock you out.

### initPassport( passport ) -> void
Called by autohost with its passport instance. This is where you must wire in the strategies used by your auth provider.

### serializeUser( user, done ) -> void
Called from passport in order to get a raw representation of the user before storing. The done callback follows the typical Node ( error, result ) format.

```javascript
function serializeUser( user, done ) { done( null, JSON.stringify( user ) ); };
```
### strategies
This array must contain any passport strategy you intend to use in authenticating requests or sockets. You can see from the mock auth provider in authost's specifications what this looks like:

```javascript
// note that each of these constructors is taking a function that gets invoked to
// determine if a request is valid based on data provided to it by the strategy
...
	strategies: [
		new Basic( authenticateCredentials ),
		new Bearer( authenticateToken ),
		new Query( authenticateQuery )
	],
...
```

### updateActions( set ) -> promise|void
Autohost calls this at start-up with a data structure that defines all the resources and their actions currently loaded. This is effectively how your storage layer can keep up with what actions are available in the service. The promise returned should complete after your storage layer has persisted any new actions.

```javascript
// the format of the set
/*
	{
		'resourceOne': [ 'resourceName.actionOne', 'resourceName.actionTwo' ],
		'resourceTwo': [ 'resourceName.actionOne', 'resourceName.actionTwo' ]
	}
*/

// one way to traverse the data structure and conditionally create actions
function updateActions( set ) {
	var list = _.flatten(
			_.map( actionList, function( resource, resourceName ) {
				return _.map( resource, function( action ) { 
					return db.upsert( action, resourceName );
				} );
			} ) );
	return when.all( list );
}
```

	Note: the list is always the *complete* list. Your provider will need to handle this idempotently.

## Optional API
The remaining optional methods are intended to do two things:
 
 * power autohost's HTTP API and dashboard around auth management
 * provide a uniform standard for programmatic control of permissions across auth implementations

All of these calls must return a promises. Most of them are simply to indicate completion and aren't expected to resolve to a value. While each function does have a section further down, descriptions of these operations are sparse because they're hopefully self-explanatory.

 * changeActionRoles: function( actionname, roles, operation ) // adds or removes roles from the action
 * changePassword: function( username, password ) // changes the stored password for the user
 * changeUserRoles: function( username, roles, operation ) // adds or removes roles from the user
 * createRole: function( rolename ) // add a role to the system
 * createUser: function( username, password ) // add a new set of credentials
 * createToken: function( username, token ) // add a token to the user record for token authentication 
 * deleteAction: function( actionname ) // delete the action from the system
 * deleteRole: function( rolename ) // delete the role from the system
 * deleteUser: function( username ) // delete the user from the system
 * destroyToken: function( username, token ) // remove the token from the user record
 * disableUser: function( username ) // disables the user account
 * enableUser: function( username ) // enables the user account
 * getActions: function( [continuation|limit] ) // get a list of action records
 * getRoles: function( [continuation|limit] ) // get a list of roles
 * getTokens: function( username ) // return the list of tokens for an account
 * getUsers: function( [continuation|limit] ) // get a list of user records

### Deletions
For any deletion you can choose to use soft-delete, but the record should be invisible to autohost after this operation. Returning a record to autohost after it has been deleted will result in unpredictable outcomes.

### Continuations (paging & sorting)
Because every storage backend is a bit different, autohost uses the idea of a continuation object that can be passed between client and server to control paging. (If you're familiar with systems like Riak, the reason is obvious). The continuation will be attached to the resulting list via a `continuation` property.

#### Data structure
A continuation can be any object format with values that are opaque to autohost. For most databases, a continuation can make use of properties that autohost does understand:

```javascript
{
	limit: 10,			// The # of records to fetch
	page: 1, 			// 1 based page indexing
	sort: {
		fieldOne: 1,	// sort ascending by this field
		fieldTwo: -1 	// sort descending by this field
	}
}
```
#### Query parameters
When making requests to autohost's HTTP API for any of the functions supporting continuations, you can use the following query string parameters:
	
	page=1
	limit=10
	asc=fieldOne,fieldTwo
	desc=fieldThree,fieldFour

All of the above options together would make a query string that looks like:
	
	?page=1&limit=10&asc=fieldOne,fieldTwo&desc=fieldThree,fieldFour

#### Function argument
When calling functions that support continuations programatically, you can either pass a continuation object or simply provide the limit you want as an integer. Making any call without a limit or continuation should result in a full list. You have the option as an auth library implementer to never return all results and always force a default limit.

### changeActionRoles( actionname, roles, operation ) -> promise|void
Either adds or removes the roles from the action record. The operation can be either 'add' or 'remove'.

### changePassword( username, password ) -> promise|void
Changes the password stored on the user record. Here's an example of that using the bcrypt library. Never store a password in clear text. Never store a password in clear text. Always salt your hashed passwords. They just taste better. Did we mention never store a password in clear text?

```javascript
var crypt = require( 'bcrypt' );
function changePassword( username, password ) {
	var salt = crypt.genSaltSync( 10 ),
		hash = crypt.hashSync( password, salt );
	return db.changePassword( username, salt, hash );
}
```

	Note: Never store a password in clear text.

### changeUserRoles( username, roles, operation ) -> promise|void
Either adds or removes the roles from the user record. The operation can be either 'add' or 'remove'.

### createRole( rolename ) -> promise|void
Adds a role to your storage back-end. This is really just here to power the dashboard/api and keep up with the concept of roles. It is in no way intended to be required in order to attach a role name to actions or users.

### createUser( username, password ) -> promise|void
Creates a user record. Your library is expected to handle hashing/salting of the password. Here's an example of that using the bcrypt library.

```javascript
var crypt = require( 'bcrypt' );
function createUser( username, password ) {
	var salt = crypt.genSaltSync( 10 ),
		hash = crypt.hashSync( password, salt );
	return db.createUser( username, salt, hash );
}
```

	Note: Did you store a password in clear text? Don't.

### createToken( username, token ) -> promise|void
Adds the token to the user's tokens.

### deleteAction( actionname ) -> promise|void
Result in the action record not being returned in future listings.

### deleteRole( rolename ) -> promise|void
Result in the role record not being returned in future listings.

### deleteUser( username ) -> promise|void
Result in the user record not being returned in future listings.

### destroyToken( username, token ) -> promise|void
Removes the token from the user's tokens.

### disableUser( username ) -> promise|void
Sets the user disabled flag to true.

### enableUser( username ) -> promise|void
Sets the user disabled flag to false.

### getActions( [limit|continuation] ) -> promise|array of action record
Returns a promise that resolves to a list of actions. The expectation is that each action record will contain the name, resource and roles list.

### getRoles( [limit|continuation] ) -> promise|array of role names
Return a promise resolving to a string array of roles associated with the user.

### getTokens( username ) -> promise|array of tokens
Return a promise resolving to a string array of tokens associated with the user.

### getUsers( [limit|continuation] ) -> promise|array of action record
Returns a promise that resolves to a list of users. The expectation is that each user record will contain the name, disabled flag and roles list.

## Other thoughts
If you stored user passwords in clear text, please consider not storing user passwords in clear text.