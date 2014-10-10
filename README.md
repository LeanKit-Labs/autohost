# autohost
Convention-based, opinionated HTTP server library based on express. Lovingly ripped from the guts of Anvil.

## Rationale
As more services are introduced to a system, the tedium of fitting together all the same libraries over and over:
 
 * is soul-draining
 * encourages copy/pasta
 * adds inertia across multiple projects
 * increases the surface area for defects and maintenance
 
I created autohost so we could have a consistent, reliable and extendible way to create HTTP/socket powered sites and services. Autohost also attempts to introduce some conventions and structure to projects so that express routes don't end up all over the place and mixed with application logic.

## Features

 * Resource-based: define transport-agnostic resources that interact via HTTP or WebSockets
 * Supports server-side websockets and socket.io
 * Supports multiple Passport strategies via a pluggable auth provider approach
 * UI dashboard to review resources' routes, topics and static paths
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
The object literal follows the format:

```js
// default values shown for each property
{
	static: './public', // where to host static resources from
	resources: './resource', // where to load resource modules from
	modules: [], // list of npm resource modules to load
	port: 8800, // what port to host at
	allowedOrigin: 'leankit.com', // used to filter incoming web socket connections based on origin
	urlPrefix: undefined, // applies a global prefix to all routes - for use behind reverse proxy
	apiPrefix: '/api', // allows you to change the prefix for resource action URLs only
	socketIO: false, // enables socket.io,
	websocket: false, // enables websockets
	noSession: false, // disables sessions
	noCookie: false, // disables cookies
	noBody: false, // disables body parsing
	noCrossOrigin: false, // disables cross origin
	anonymous: [] // add paths or url patterns that bypass authentication and authorization
}
```

Please refer to the [session](#session) section for information on additional configuration options that control how the session is configured.

### AuthProvider
There are already two available auth provider libraries available:
 * [autohost-riak-auth](https://github.com/LeanKit-Labs/autohost-riak-auth)
 * [autohost-nedb-auth](https://github.com/LeanKit-Labs/autohost-nedb-auth)

You can NPM install either of these and easily drop them into your project to get going. Each library supports all optional features and can be managed from the auth dashboard built into autohost.

	Note: the authProvider passed in can be an unresolved promise, autohost will handle it

Planned support for:
 * MS SQL server

### fount
[fount](https://github.com/LeanKit-Labs/fount) is a dependency injection library for Node. If your application is using fount, you can provide the instance at the end of the init call so that your resources will have access to the same fount instance from the `host.fount` property within the resource callback.

## Resources
Resources are expected to be simple modules containing a factory method that return a resource definition. Autohost now supports dependency resolution by argument in these factory methods. All arguments after the first (`host`) will be checked against autohost's fount instance. This is especially useful when you need to take a dependency on a promise or asynchronous function - fount will only invoke your resource's factory once all dependnecies are available eliminating the need to handle these concerns with callbacks or promises in your resource's implementation. See the Asynchronous Module example under the Module section. 

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
__Synchronous Module - No Fount Dependencies__
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

__Asynchronous Module - Fount Dependencies__
This example assumes that you have either provided your own fount instance to autohost or defined dependencies via autohost's fount instance before calling autohost's `init` call.

```js
// example using autohost's fount instance
var host = require( 'autohost' );

host.register( 'myDependency1', { ... } );
host.register( 'myDependency2', somePromise );

```

```js
// Each argument after `host` will be passed to fount for resolution before the exported function
// is called.
module.exports = function( host, myDependency1, myDependency2 ) {
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

To enable this, simply add the module names as an array in the `modules` property of the configuration hash passed to init.

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
	session: // session hash
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
    redirect: function( [statusCode = 302 ,] url) //redirects to url.
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

## External Resources - Loading an NPM Resource Module
Autohost allows you to specify a list of NPM modules that it will attempt to load as resources. This feature is intended to allow you to package a resource and its static files into an NPM module that can be shared. This may seem like an odd feature at first, but hopefully it will lead to some interesting sharing of common APIs and/or UIs for autohost based services. (example - realtime metrics dashboard)

## HTTP Transport
The http transport API has three methods you can call to add middleware, API routes and static content routes. While you should rely on resources to supply routes, it's very common to add your own middleware. Authost will always add your middleware *after* its standard middleware and passport (unless you have turned off specific middleware via configuration).

 * `host.http.middleware( mountPath, callback )`
 * `host.http.route( url, callback )`
 * `host.http.static( url, filePath )`

Keep in mind - most of the features you'll want to add beyond what autohost provides can probably be accomplished via middleware.

### Route prefixes
Autohost's config provides two optional arguments you can use to control the HTTP routes that get created on your behalf.

#### apiPrefix
By default autohost places all resource action routes behind `/api` to prevent any collisions with static routes. You can remove this entirely by providing an empty string or simply change it so something else.

	Note: a `urlPrefix` will always precede this if one has been supplied.

#### urlPrefix
In the rare event that you are using a reverse proxy in front of autohost that is routing requests from a path segment to your autohost service, you can use a urlPrefix to ensure that whatever leading path from the original url causes a redirection to your autohost service aligns with the routes supplied to express.

__Example__
You have a public HTTP endpoint that directs traffic to your primary application (`http://yourco.io`). You want to reverse proxy any request sent to the path `http://yourco.io/special/` to an interal application. The challenge is that all your static resources (html, css, js) that contain paths would normally expect that they could use absolute paths when referencing api routes or other static resources. ( examples: `/css/style.css`, `/js/lib/jquery.min.js`, `/api/thingy/10`) The problem is that the browser will make these requests which will be directed to your original application server since they don't begin with the `/special` path segment that is activating the reverse proxy to begin with. This will cause you to either activate routes in the original application (which will be incorrect) _or_ get a bunch of 404s back from your front-end application.

While you could simple prefix all of your absolute URLs in static resources with `/special' (in this example), this will cause your application to be unusable without a reverse proxy sitting in front of it since the browser would be making requests to a route that doesn't exist and nothing is there to intercept and strip away the `/special` path prefix. This makes integration testing and local development unecessarily painful.

The solution is to use `urlPrefix` set to 'special' and to either write all your URLs in static resources with the prefix (meh) OR use a build step that will find absolute paths in your static files and prefix them for you. Autohost will automatically apply this prefix to all routes in your service so that requests from the proxy align with the routes defined in your application consistently. This results in an application that remains usable outside of the reverse proxy and can even be built and deployed with different path prefixes (or no prefixes).

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
 * `host.socket.send( id, topic, message )` - sends message to specific client via websocket (returns true if successful)
 * `host.socket.notify( topic, message )` - sends message to all clients connected via socket

### Events
These events can be subscribed to via `host.on`:

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

### Session
By default, Autohost uses [express session](https://github.com/expressjs/session) as the built in session provider. You can change several of the configuration settings for the session via Autohost's config hash:

 * sessionId - provides a name for the session cookie. default: 'ah.sid'
 * sessionSecret - signs cookie with a secret to prevent tampering. default: 'autohostthing'
 * sessionStore - the session store interface/instance to use for persisting session. default: in memory store

This example demonstrates using the redis and connect-redis libraries to create a redis-backed session store.
```javascript
var host = require( 'autohost' );
var authProvider = require( 'autohost-nedb-auth' )( {} );

var redis = require( 'redis' ).createClient( port, address );
var RedisStore = require( 'connect-redis' )( host.session );
var store = new RedisStore( {
		client: redis,
		prefix: 'ah:'
	} );

host.init( {
	sessionId: 'myapp.sid',
	sessionSecret: 'youdontevenknow',
	sessionStore: store,
}, authProvider );
```

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
	
	Note: you CANNOT change this route. It must be consistent so that autohost's dashboards can always reach this endpoint.
	
The metadata follows this format:

```json
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
```

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
