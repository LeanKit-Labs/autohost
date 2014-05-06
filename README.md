# autohost
Convention-based, opinionated HTTP server library based on express. Lovingly ripped from the guts of Anvil.

__This library is experimental and rapidly changing.__

## Features

 * Resource-based: define protocol-agnostic resources that interact via HTTP or WebSockets
 * Auto-reloads resources on file change
 * Supports server-side websockets or socket.io
 * UI dashboard to review resources' routes, topics and hosted paths

## UI Dashboard
Simple navigate to /_autohost to review the current set of resources:
![An Example AutoHost Application's Dashboard](http://i4.minus.com/jbnWId8h3hZcac.png)

## Quick Start

```js
var host = require( 'autohost' )();
host.init();
```

## Configuration
Configuration can be provided optionally to the init call or during instantiation after the require. The object literal follows the format:

```js
{
	processes: 1, // # of processes to spawn - not currently in use
	static: './public', // where to host static resources from, default value shown
	resources: './resource', // where to load resource modules from, default value shown
	port: 8800, // what port to host at, default shown
	allowedOrigin: 'leankit.com', // used to filter incoming web socket connections based on origin
	websockets: true, // enables websockets
	socketIO: true // enables socket.io
}
```

## Resources
Resources are expected to be simple modules that return a parameterless function resulting in a JS literal that follows the format:

```js
	{
		name: 'resource-name',
		resources: '', // relative path to static assets for this resource
		actions: [ 
			{
				alias: 'send', // not presently utilized
				verb: 'get', // http verb
				topic: 'send', // topic segment appended the resource name
				path: '', // url pattern appended to the resource name
				handle: function( envelope ) {
					// envelope.data, envelope.headers and envelope.params may contain
					// information about the request/message received

					// envelope reply takes a object literal with data property for
					// http body|websocket message					
				}
			}
		]
	}
```

## Authentication
Authentication support is supplied via Passport integration. Your application is expected to provide a strategy and authentication method. You can also provide a regex path to make part of your path open to anonymous access.

You must set this up BEFORE calling .init, calling it after initialization will probably cause 'splosions.

```javascript
// Note: this is an over-simplification, typically you'd tie in auth store access inside the callback.
// Each passport strategy implementation will differ, please see those for details.
var passport = require( 'passport' );
var BasicStrategy = require( 'passport-http' ).BasicStrategy;
var host = require( '../src/autohost.js' )();

host.withPassportStrategy(
	new BasicStrategy({}, function( username, password, done ) {		
		if( username == 'anon' || ( username == 'admin' && password == 'admin' ) ) {
			done( null, username );
		} else {
			done( null, false );
		}
	} ),
	passport.authenticate( 'basic', { session: false } ),
	/^[\/]anon.*/ );
```

## Authorization
The general approach is this:
 1. every action in the system is made available to the authorization strategy on start-up
 1. an action may be assigned to one or more roles in your authorization strategy
 1. a user may be assigned to one or more roles in your authorization strategy
 1. when a user attempts to activate an action, the action roles are checked against the user roles
   1. if a match is found in both lists, the action completes
   1. if the user has no roles that match any of the action's roles, the action is rejected (403)
   1. if the action has NO roles assigned to it, the user will be able to activate despite roles

This basically goes against least-priviledge. If this is a problem, assign a baseline 'authenticated' or 'user' role to every action returned to you during server start-up OR always return either of these during the 'getRolesFor' call.

The authorization strategy MUST implement 3 calls:

### actionList( list, done )
Will recieve a hashmap of resources and resource action names. Action names follow a namespace convention of {resource name}.{alias}. The done call back MUST be called.

Here's an example of the format.
```javascript
{
	'_autohost': [
		'_autohost.api', 
		'_autohost.resources', 
		'_autohost.actions', 
		'_autohost.connected-sockets'
	]
}
```

This is provided to your auth provider so that actions can automatically be updated (as in storage) on-the-fly when the server spins up.

### getUserRoles( user, done ) -- done( err, roles )
Given a user's id, this must return any roles assigned to the user in the system. Done must be called with error or roles. An exception should never be allowed to bubble up through this call.

### getRolesFor( action ) -- done( err, roles )
During activation, the action name ( resource.alias ) is passed to this call to determine what roles are able to activate the action. If you don't want actions to default to enabled despite user role, ALWAYS return at least some baseline role ( i.e. 'user', 'authenticated', etc. ).

Done must be called with error or roles. An exception should never be allowed to bubble up through this call.

## Auth admin panel (Experimental)
In order to use this feature, you must provide an authorization strategy with several additional calls. It should go without saying that you're expected invoke the callback with either the result or an error.

__Documentation on this API coming soon, see autohost-riak-auth library for an example__
		
## Web Socket Stuff

### Methods
 * sendToClient( id, topic, message ) - sends message to specific client via websocket (returns true if successful)
 * notifyClients( topic, message ) - sends message to all clients via web sockets 

### Events

 * 'socket.client.connected', { socket: socketConnection } - raised when a client connects
 * 'socket.client.identified', { socket: socketConnection, id: id } - raised when client reports unique id

## TO DO
 * Add support for clustering (multiple listening processes)
 * Add support for user authentication and authorization (access) logging
 * Add support for rate limiting
 * Better logging
 * More thorough error handling

## License
MIT License - http://opensource.org/licenses/MIT