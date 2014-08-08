# autohost
Convention-based, opinionated HTTP server library based on express. Lovingly ripped from the guts of Anvil.

## Rationale
As more services are introduced to a system, the tedium of fitting together all the same libraries over and over:
 
 * is a soul-draining
 * encourages copy/pasta
 * adds inertia across multiple projects
 * increases the surface area for defects and maintenance
 
I created autohost so we could have a consistent, reliable and extendible way to create HTTP/socket powered sites and services. Autohost also attempts to introduce some conventions and structure to projects so that express routes don't end up all over the place and mixed with application logic.
 
## Features

 * Resource-based: define transport-agnostic resources that interact via HTTP or WebSockets
 * Supports server-side websockets and socket.io
 * Supports multiple Passport strategies via a pluggable auth provider approach
 * UI dashboard to review resources' routes, topics and hosted paths
 * HTTP Auth API and dashboard for managing permissions
 * Detailed metrics around routes, topics, authentication and authorization

## Quick Start

	npm init
	npm install autohost autohost-nedb-auth -S

#### ./index.js - the most boring app ever
```js
var host = require( 'autohost' ),
	authProvider = require( 'autohost-nedb-auth' )( {} );
host.init( {}, authProvider );
```

	node index.js
	
Open your browser to: `http://localhost:8800/_autohost'

This dashboard will create a tab for each resource autohost has loaded and display the topics, urls and paths that it has registered for each. You can see here that, since we haven't provided our own static files or resources, the only thing showing up is autohost's own HTTP API and static files that make up this dashboard.

Before diving into how to add resources, take a look at the init call and its arguments to understand what's available.

### init( config, authProvider, [fount] )
Let's take a look at each argument you can pass to autohost's init call to understand what each one does.

### Configuration
While the configuration can be provided optionally to the init call, *it's recommended to pass this during instantiation after the require*. 

The object literal follows the format:

```js
// default values shown for each property
{
	static: './public', // where to host static resources from
	resources: './resource', // where to load resource modules from
	port: 8800, // what port to host at
	allowedOrigin: 'leankit.com', // used to filter incoming web socket connections based on origin
	apiPrefix: '/api', // allows you to change the prefix for resource action URLs
	socketIO: false, // enables socket.io,
	websockets: false, // enables websockets
	noSession: false, // disables sessions
	noCookie: false, // disables cookies
	noBody: false, // disables body parsing
	noCrossOrigin: false // disables cross origin
}
```

### AuthProvider
There are already two available auth provider libraries available:
 * [autohost-riak-auth](https://github.com/LeanKit-Labs/autohost-riak-auth)
 * [autohost-nedb-auth](https://github.com/LeanKit-Labs/autohost-nedb-auth)

You can NPM install either of these and easily drop them into your project to get going. Each library supports all optional features and can be managed from the auth dashboard built into autohost.

	Note: the authProvider passed in can be an unresolved promise, autohost will handle it

Planned support for:
 * MS SQL server

### fount
[fount](https://github.com/LeanKit-Labs/fount) is a dependency injection library for Node. If your application is using fount, you can provide the instance here so that your resources will have access to the same fount instance from the `host.fount` property within the resource callback. Confused? Read on!

## Resources
Resources are expected to be simple modules containing a factory method that return a resource definition:

### Path conventions
Autohost expects to find all your resources under one folder (`./resource` by default) and your shared static resources under one folder (`./public` by default). Each resource should have its own sub-folder and contain a `resource.js` file that contains a module defining the resource.

####Folder structure
	-myProject
	 `-- resource
	 |	`-- profile
	 |  |  |-- resource.js
	 |  |
	 |  `-- otherThing
	 |  |  |-- resource.js
	 `--public
	 |  `--css
	 |  |  |--main.css
	 |  `--js
	 |  |  |--jquery.min.js
	 |  |  |--youmightnotneed.js
	 |  |--index.html

####Module
```js
module.exports = function( host ) {
	return {
		name: 'resource-name',
		resources: '', // relative path to static assets for this resource
		actions: [ 
			{
				alias: 'send', // not presently utilized
				verb: 'get', // http verb
				topic: 'send', // topic segment appended the resource name
				path: '', // url pattern appended to the resource name
				handle: function( envelope ) {
					// see section on envelope for more detail			
				}
			}
		]
	};
};
```
### name
The resource name is pre-pended to the action's alias to create a globally unique action name: `resource-name.action-alias`. The resource name is also the first part of the action's URL (after the api prefix) and the first part of a socket message's topic:

	http://{host}:{port}/api/{resource-name}/{action-alias|action-path}
	
	topic: {resource-name}.{action-topic|action-alias}

### resources
You can host nested static files under a resource using this property. The directory and its contents found at the path will be hosted after the resource name in the URL.

## Actions
The list of actions are the operations exposed on a resource on the available transports.

### alias
An alias is the 'friendly' name for the action. To create a globally unique action name, autohost pre-pends the resource name to the alias: `resource-name.action-alias`.

### verb
Controls the HTTP method an action will be bound to.

### topic
This property controls what is appended to the resource name in order to create a socket topic. The topic is what a socket client would publish a message to in order to activate an action.

### path
The path property overrides the URL assigned to this action. You can put path variables in this following the express convention of a leading `:`

	path: '/thing/:arg1/:arg2'
	
Path variables are accessible on the envelope's `params` property. If a path variable does NOT collide with a property on the request body, the path variable is written to the `envelope.data` hash as well:

```javascript
	envelope.data.arg1 === envelope.params.arg1;
```

#### query parameters
Query parameters behave exactly like path variables. They are available on the `params` property of the envelope and copied to the `envelope.data` hash if they wouldn't collide with an existing property.

### handle
The handle is a callback that will be invoked if the caller has adequate permissions. Read the section on envelopes to understand how to communicate results back to the caller.

> **FOOD FOR THOUGHT**

> You should not include your application logic in a resource file. The resource is there as a means to 'plug' your application logic into HTTP and websocket transports. Keeping behavior in a separate module will make it easy for you to test your code apart from autohost.

## Envelope
Envelopes are an abstraction around the incoming message or request. They are intended to help normalize interactions with a client despite the transport being used.

```javascript
// common properties/methods
{
	context: // metadata added by middleware
	cookies: // cookies on the request
	data: // the request/message body
	headers: // request or message headers
	path: // url of the request (minus protocol/domain/port) OR message topic
	responseStream: // a write stream for streaming a response back to the client
	user: // the user attached to the request or socket
	transport: // 'http' or 'websocket'
	reply: function( envelope ) // responds to client
	replyWithFile: function( contentType, fileName, fileStream ) // streams a file back to the client
}

// the following properties/methods are only available on HTTP envelopes
{
	params: // query parameters
	files: // files supplied in body
	forwardTo: function( options ) // forward the request (for building proxies)
}

// the following properties are only available on Socket envelopes
{
	replyTo: // the topic to send the reply to
	socket: // the client's socket
}
```

### reply( envelope )
Sends a reply back to the requestor via HTTP or web socket. Response envelope is expected to always have a data property containing the body/reply. HTTP responses can included a statusCode property (otherwise a 200 is assumed).

```javascript
	envelope.reply( { data: { something: 'interesting' }, statusCode: 200 } );
	// HTTP response body will be JSON { something: 'interesting' }
	// Socket.io will have a payload of { something: 'interesting' } published to the replyTo property OR the original topic
	// Websockets will get a message of { topic: replyTo|topic, data: { something: 'interesting' } } 
```

### replyWithFile( contentType, fileName, fileStream )
Sends a file as a response.

### forwardTo( opts )
Forwards the request using the request library and returns the resulting stream. Works for simple proxying.

```javascript
	envelope.forwardTo( {
		uri: 'http://myProxy/url'
	} ).pipe( envelope.responseStream );
```

## HTTP Transport
The http transport API has three methods you can call to add middleware, API routes and static content routes. While you should rely on resources to supply routes, it's very common to add your own middleware. Authost will always add your middleware *after* its standard middleware and passport (unless you have turned off specific middleware via configuration).

 * `host.http.registerMiddleware( mountPath, callback )`
 * `host.http.registerRoute( url, callback )`
 * `host.http.registerStaticPath( url, filePath )`

Keep in mind - most of the features you'll want to add beyond what autohost provides can probably be accomplished via middleware.

### Metadata

## Web Socket Transport
Autohost supports two socket libraries - socket.io for browser clients and websocket-node for programmatic/server clients.

### HTTP Middleware
HTTP middleware runs during socket interactions as well. This ensures predictability in how any client is authenticated and what metadata is available within the context of activating resource actions.

### Authentication
Autohost takes the unique approach of authenticating the HTTP upgrade request BEFORE the upgrade is established. This is preferable to the standard practice of allowing a socket connection to upgrade and then checking the request or performing some client-implemented handshake after the fact.

### WebSocket-Node library
When establishing a connection to autohost using the WebSocket-Node client, you'll need to append '/websocket' to the end of the URL.

### Uniform API
Autohost normalizes the differences between each library with the same set of calls:

 * `socket.publish( topic, message )` - sends a message with the topic and message contents to the socket
 * `host.socket.sendToClient( id, topic, message )` - sends message to specific client via websocket (returns true if successful)
 * `host.socket.notifyClients( topic, message )` - sends message to all clients connected via socket

### Events

 * 'socket.client.connected', { socket: socketConnection } - raised when a client connects
 * 'socket.client.identified', { socket: socketConnection, id: id } - raised when client reports unique id
 * 'socket.client.closed', { socket: socketConnection, id: id } - raised when client disconnects the websocket connection

## Auth
Authentication and authorization are supplied by an auth provider library that conforms to autohost's auth specifications. You can read more about that at [here](/blob/master/docs/authprovider.md).

### Programmatic control
The auth library is available by reference via the auth property on the host object: `host.auth`. Whatever API methods have been implemented are callable by your application.

### Authentication
Autohost expects the auth provider to supply one or more Passport strategies.

### Authorization
Autohost assigns roles to users and actions. If a user has a role that is in an action's list, the user can invoke that action via HTTP or a socket message. If the action has no roles assigned, there is no restriction and any authenticated user (including anonymous users) can activate the action.

The general approach is this:
 1. every action in the system is made available to the auth provider library on start-up
 1. an action may be assigned to one or more roles
 1. a user may be assigned to one or more roles
 1. when a user attempts to activate an action, the action roles are checked against the user roles
   1. if a match is found in both lists, the action completes
   1. if the user has no roles that match any of the action's roles, the action is rejected (403)
   1. if the action has NO roles assigned to it, the user will be able to activate the action

This basically goes against least-priviledge and is really only in place to prevent services from spinning up and rejecting everything. To prevent issues here, you should never expose a service publicly before configuring users, roles and actions.

### Auth API and Admin Dashboard (Under development)
The auth dashboard only works with auth providers that implement the entire specification. If that's available, you can fully manage users, roles and actions from this. It is hosted at http://{your server}:{port}/_autohost/auth.html

## UI Dashboard
Simple navigate to /_autohost to review the current set of resources:
![An Example AutoHost Application's Dashboard](http://i4.minus.com/jbnWId8h3hZcac.png)

## Metrics
Autohost collects a good bit of metrics. It measures action activation as well as authorization and authentication calls so that you can get detailed information on where time is being spent in the stack at a high level. The metrics also include memory utlization as well as system memory and process load. You can see the raw JSON for the metrics at:

	http://{host}:{port}/api/_autohost/metrics

## Metadata
Autohost provides metadata to describe the routes and topic available via an OPTIONS to api:

	OPTIONS http://{host}:{port}/api
	
	Note: you CANNOT change this route. It must be consistent so that autohost's dashboards can find
	
The metadata follows this format:

{
    "resource-name": {
        "routes": {
            "action-alias": {
                "verb": "get",
                "url": "/api/resource-name/action-alias|action-path"
            }            
        },
        "path": {
            "url": "/_autohost",
            "directory": "/git/node/node_modules/autohost/src/_autohost/public"
        },
        "topics": {
            "action-alias": {
                "topic": "resource-name.action-alias"
            }
        }
    },
    "prefix": "/api"
}

In the future, the intent is to provide more metadata like this in various contexts as well as provide clients (for Node and the browser) that can consume this information to create clients dynamically based on the data.


## Debugging
You can get a lot of visibility into what's happening in autohost in real-time by setting the DEBUG environment variable. If you _only_ want to see autohost debug entries, use autohost*.

	DEBUG=autohost* node index.js

## Dependencies
autohost would not exist without the following libraries:
 * express 			4.7.2
 * socket.io 		1.0.6
 * websocket-node 	1.0.8
 * passport 		0.2.0
 * postal			0.10.1
 * request			2.39.0
 * when 			3.4.2
 * lodash 			2.4.1

## TO DO
 * Add support for clustering (multiple listening processes)

## Contributing
There are a lot of places you can contribute to autohost. Here are just some ideas:

### Designers
 * Better designs for both the general dashboard and auth dashboard
 * Logo

### Developers
 * A clustering feature that would handle setting up a cluster of N nodes
 * A way to visualize the metrics information in the app
 * Feature to enable auto-pushing metrics JSON up to socket clients on regular interval

### Op/Sec
I would be interested in seeing if particular Passport strategies and how they're being wired in would be subject to any exploits. Knowing this in general would be great, but especially if I'm doing something ignorant with how it's all being handled and introducing new attack vectors, I'd like to find out what those are so they can be addressed.

## License
MIT License - http://opensource.org/licenses/MIT