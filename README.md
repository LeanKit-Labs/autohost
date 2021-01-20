# autohost
Convention-based, opinionated HTTP server library based on express. Lovingly ripped from the guts of Anvil.

## Rationale
As more services are introduced to a system, the tedium of fitting together all the same libraries over and over:

 * is soul-draining
 * encourages copy/pasta
 * adds inertia across multiple projects
 * increases the surface area for defects and maintenance

I created autohost so we could have a consistent, reliable and extendible way to create HTTP/socket powered sites and services. By introducing conventions and structure to projects, route definitions and handlers aren't scattered throughout the source and mixed with application logic.

## Features

 * Resource-based: define transport-agnostic resources that interact via HTTP or WebSockets
 * Supports server-side websockets and socket.io
 * Supports multiple Passport strategies via a pluggable auth provider approach

> __Note__

> The dashboard and related APIs are no longer included with autohost. They have been moved to a separate project: [autohost-admin](https://github.com/LeanKit-Labs/autohost-admin).

## Quick Start

	npm init
	npm install autohost autohost-nedb-auth -S

#### ./index.js - the most boring app ever
```js
var autohost = require( 'autohost' );
var auth = require( 'autohost-nedb-auth' )( {} );
var host = autohost( { authProvider: auth } );
// additional setup, like custom middleware would go here
host.start(); // starts the server
```

	node index.js

## autohost( config )
Refer to the section below for a list of available configuration properties and default values.

### Configuration
The object literal follows the format:

```js
// default shown for each property
{
	static: './public', 	// where to host static resources from
	anonymous: [], 			// add paths or url patterns that bypass authentication and authorization,

	port: 8800, 			// host port
	urlPrefix: undefined, 	// applies a global prefix to all routes - for use behind reverse proxy
	apiPrefix: '/api', 		// changes the prefix for resource action URLs only

	resources: './resource', // where to load resource modules from
	modules: [], 			// list of npm resource modules to load

	authProvider: undefined, // a promise for or instance of an authentication provider
	allowedOrigin: , 		// used to filter incoming web socket connections based on origin
	socketIO: false, 		// enables socket.io - can be false, true (using default options) or an options object
	websocket: false, 		// enables websockets

	noBody: false, 			// disables body parsing
	noCookie: false, 		// disables cookies
	noCrossOrigin: false, 	// disables cross origin
	noOptions: false, 		// disables automatic options middleware
	noProxy: false, 		// disables trusted proxies
	noSession: false, 		// disables sessions

	session: 				// session configuration
	cookie: 				// session cookie configuration
	getUserString:			// method to return a string id for a user

	enableAccessLogs: true,// enables access logs
	logging: {}, 			// configuration passed to autohost's whistlepunk instance
	fount: undefined, 		// pass the app's fount instance to autohost

	parseAhead: false, 			// parses path parameters before application middleware
	handleRouteErrors: false, 	// wrap routes in try/catch
	urlStrategy: undefined 		// a function that generates the URL per resource action
}
```

#### Socket.io
The configuration options (above) value for `socketIO` can be `false` (disabled), `true` (enabled with basic socket.io defaults) or an `object` specifying any [option supported by socket.io](http://socket.io/docs/server-api/#server(opts:object)).

#### Session Configuration
By default [express session](https://github.com/expressjs/session) is the session provider. To change any settings for how the session is configured, provide a hash with values for any of the properties shown below.

```javascript
// default shown for each property
{
	name: 'ah.sid',
	secret: 'autohostthing',
	resave: true,
	store: new sessionLib.MemoryStore(),
	saveUninitialized: true,
	rolling: false
}
```

This example demonstrates using the redis and connect-redis libraries to create a redis-backed session store.
```javascript
var autohost = require( 'autohost' );
var auth = require( 'autohost-nedb-auth' )( {} );

var redis = require( 'redis' ).createClient( port, address );
var RedisStore = require( 'connect-redis' )( host.session );
var store = new RedisStore( {
		client: redis,
		prefix: 'ah:'
	} );

host = autohost( {
	authProvider: auth,
	session: {
		name: 'myapp.sid',
		secret: 'youdontevenknow',
		store: store
	}
} );
host.start();
```

#### Ending a session
To end a session:

 * `logout` method on the envelope in a resource action handle
 * `logout` on the request in any middleware

#### Session Cookie Configuration
To change any settings for how the session **cookie** is configured, provide a hash with values for any of the properties shown below.

```javascript
// default shown for each property
{
	path: '/',
	secure: false,
	maxAge: null
}
```

#### Static

The static option supports either a path, an options hash, or `false`. Currently, the options (except `path`) are passed through to [`express.static`](http://expressjs.com/guide/using-middleware.html#express.static) with the `path` property being used as the route. (If set to `false`, no default static path will be auto-configured):

```js
{
	static: {
		path: './public',
		maxAge: '2d',
		setHeaders: function ( res, path, stat ) { ... }
	}
}
```

### AuthProvider
There are already two available auth provider libraries available:
 * [autohost-riak-auth](https://github.com/LeanKit-Labs/autohost-riak-auth)
 * [autohost-nedb-auth](https://github.com/LeanKit-Labs/autohost-nedb-auth)

Each library supports all optional features and can be managed from the [admin add-on](https://github.com/LeanKit-Labs/autohost-admin).

	Note: the authProvider passed in can be an unresolved promise, autohost will handle it

Planned support for:
 * MS SQL server

### getUserString

 The `getUserString` option expects a method that accepts `user` as its only parameter, and returns a string (used for logging) to identify the user. The default method provided attempts the following steps:

 * return `user.name` if available, otherwise:
 * return `user.username` if available, otherwise:
 * return `user.id` if available, otherwise:
 * return `JSON.stringify( user )`

 Override this method with custom logic if the default does not match your field names on your user object. For instance:

 ```js
 {
 	getUserString: function ( user ) {
 		return user.login;
 	}
 }
 ```

### fount
[fount](https://github.com/LeanKit-Labs/fount) is a dependency injection library for Node. If the application is using fount, the application's instance can be provided at the end of the init call so that resources will have access to the same fount instance the application is using. The fount instance in use by `autohost` is available via `host.fount`.

## Resources
Resources are expected to be simple modules containing a factory method that return one or more resource definitions. Dependency resolution by argument is supported in these resource factory methods. All arguments after the first (`host`) will be checked against autohost's fount instance. This is especially useful when taking a dependency on a promise or asynchronous function. Fount will only invoke the resource's factory once all dependnecies are available, eliminating dependency callbacks or promises in the resource's implementation. See the Asynchronous Module example under the Module section.

### Path conventions
All resources must be placed under a top level folder (`./resource` by default) and shared static resources under a top level folder (`./public` by default). Each resource should have its own sub-folder and contain a `resource.js` file that contains a module defining the resource.

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
		static: '', // relative path to static assets for this resource,
		apiPrefix: '', // Optional override for global apiPrefix setting. Omit entirely to use default.
		urlPrefix: '', // URL prefix for all actions in this resource
		middleware: [],// one or more middleware functions to mount to the resource's url
		actions:  {
			send: {
				method: 'get', // http verb
				url: '', // url pattern appended to the resource name
				topic: 'send', // topic segment appended the resource name
				middleware: [], // one or more middleware functions to mount to the action's url
				authorize: , // optional predicate to check user permissions
				handle: function( envelope ) {
					// see section on envelope for more detail
				}
			}
		}
	};
};
```

__Asynchronous Module - Fount Dependencies__
This example assumes that either:

 * the application fount instance was plugged into autohost or
 * all defined dependencies were made with autohost's fount instance before calling autohost's `init` call.

```js
// example using autohost's fount instance
var autohost = require( 'autohost' );
var host = autohost( { ... } );
host.fount.register( 'myDependency1', { ... } );
host.fount.register( 'myDependency2', somePromise );

```

```js
// Each argument after `host` will be passed to fount for resolution before the exported function
// is called.
module.exports = function( host, myDependency1, myDependency2 ) {
	return {
		name: 'resource-name',
		static: '', // relative path to static assets for this resource
		apiPrefix: '', // Optional override for global apiPrefix setting. Omit entirely to use default.
		urlPrefix: '', // URL prefix for all actions in this resource
		middleware: [],// one or more middleware functions to mount to the resource's url
		actions: {
			send: {
				method: 'get', // http verb
				url: '', // url pattern appended to the resource name
				topic: 'send', // topic segment appended the resource name
				middleware: [], // one or more middleware functions to mount to the action's url
				authorize: , // optional predicate to check user permissions
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

	Note: If defining resources for use with [hyped](https://github.com/leankit-labs/hyped) - the resource name is not automatically pre-pended to the url.

### static
You can host nested static files under a resource using this property. The directory and its contents found at the path will be hosted after the resource name in the URL.

### middleware
Provides a mechanism for defining resource-level middleware either in a single function or in a list of functions. These functions are provided with an envelope and are able to make changes to it before it reaches action-specific middleware or the handle call.

Below are several examples of different middleware patterns. This should demonstrate both synchronous and asynchronous patterns for proceding and short-circuiting the stack.

```javascript
...
// all middleware must return either the result of next or a promise/data structure
middleware: [
	function( envelope, next ) {
		// invokes the next middleware or handle call
		return next();
	},
	function( envelope, next ) {
		// demonstrates returning a data structure
		if( envelope.data.example === 1 ) {
			return { data: { message: 'This will short circuit the stack and respond immediately' } };
		} else if( envelope.data.example === 2 ) {
			// demonstrates returning next asynchronously
			return somethingPromisey()
				.then( function( x ) {
					envelope.context.importantThing = x;
					return next();
				} );
		} else if( envelope.data.example === 3 ) {
			// demonstrates short-circuiting a stack via a promise
			return anotherPromise()
				.then( function( x ) {
					return { data: x };
				} );
		} else {
			return next();
		}
	}
}
...
```

## Actions
The hash of actions are the operations exposed on a resource on the available transports.

### [key]
They key of the action in the hash acts as the 'friendly' name for the action. To create a globally unique action name, autohost pre-pends the resource name to the alias: `resource-name.action-alias`.

### method
Controls the HTTP method an action will be bound to.

### topic
This property controls what is appended to the resource name in order to create a socket topic. The topic is what a socket client would publish a message to in order to activate an action.

### url - string pattern
The `url` property provides the URL assigned to this action. You can put path variables in this following the express convention of a leading `:`

	url: '/thing/:arg1/:arg2'

Path variables are accessible on the envelope's `params` property. If a path variable does NOT collide with a property on the request body, the path variable is written to the `envelope.data` hash as well:

```javascript
	envelope.data.arg1 === envelope.params.arg1;
```

### url - regular expression
The `url` can also be defined as a regular expression that will be evaluated against incoming URLs. Both `apiPrefix` and `urlPrefix` will be pre-pended to the regular expression automatically - do not include them in the expression provided.

#### query parameters
Query parameters behave exactly like path variables. They are available on the `params` property of the envelope and copied to the `envelope.data` hash if they wouldn't collide with an existing property.

#### custom url strategy
A function can be provided during configuration that will determine the url assigned to an action. The function should take the form:

```javascript
function myStrategy( resourceName, actionName, action, resourceList ) { ... }
```

The string returned will be the URL used to route requests to this action. Proceed with extreme caution.

### middleware
Provides a mechanism for defining action-level middleware either in a single function or in a list of functions. These functions are provided with an envelope and are able to make changes to it before it reaches the handle call.

__IMPORTANT__
Middleware **must** return either the result of the `next` call _or_ a promise/data structure to short circuit the stack with a response. They are mutually exclusive. Do not call both. Do not fail to return one or the other.

### authorize
The `authorize` predicate was added to actions to allow for much more fine grained, explicit control of user authorization. By default, authorization checks are performed after _all_ middleware has run. This allows middleware to provide any necessary data on the envelope's context so that the authorization strategy can use this in determining the user's access level.

To change this, provide the string "authorize" in place of a middleware call in the resource or action middleware property and the check will be performed where the string appeared in the stack. This allows an application to short-circuit the stack and avoid running middleware that performs expensive and unnecessary i/o if the user does not have permission to perform the action.

> Note: when present, this _overrides_ rather than augments any authorization check that would have been performed by a configured autohost auth library.

```javascript
...
authorize: function( envelope ) {
	return envelope.user.isAwesome;
}
...
}
```

### handle
The handle is a callback that will be invoked if the caller has adequate permissions. The handle call can return a hash (or a promise that resolve to one) with the following properties:

> Note: `data`, `file`, `forward` and `redirect` are mutually exclusive. Websockets only supports `data` and `file`.

```javascript
// defaults shown
{
	status: 200,
	data: undefined,
	cookies: {}, // set cookies sent back to the client
	headers: {}, // set headers sent back in the response
	file: { // only used when replying with file
		name: , // the file name for the response
		type: , // the content-type
		stream: // a file stream to pipe to the response
	},
	forward: { // only used if forwarding the request
		url: , // the url to forward to
		method: , // if unspecified, copies the method of the original request
		headers: , // if unspecified, copies headers in the original request
		body: // use if changing the body contents
	},
	redirect: { // only used when redirecting
		status: 302, // use to set a status other than 302
		url: // the URL to redirect to
	}
}
```

> **Recommendation**

> Don't include application logic in a resource file. The resource is there as a means to 'plug' application logic into HTTP and websocket transports. Keeping behavior in a separate module will make it easy to test application behavior apart from autohost.

#### differentiated handlers
In rare cases, you may need the ability to have multiple handler behaviors that change based on some aspect of the request. Autohost allows a hash to specify multiple handlers and conditions for when each should be applied. The list is evaluated in order, keep this in mind when putting conditions in place. If no condition is met, a 400 will be returned - the assumption being that you, the developer intentionally excluded some condition and the caller submitted a malformed request.

> Note: this feature exists primarily so our upstream hypermedia library, `hyped` can plug in handlers based on version.

```javascript
{
	handle: [
		{
			when: { version: 1 }, // providing a set of properties and values to filter requests for the handler
			then: function( envelope ) {
				...
			}
		},
		{
			when: function( envelope ) { // provide a predicate to test the envelope
				return envelope.version === 2;
			},
			then: function( envelope ) {
				...
			}
		},
		{
			when: true, // use at the end as a catch-all if desired
			then: function( envelope ) {
				...
			}
		}
	]
}
```

### Controlling Error Responses
Responses sent to the client based on an error returned from an action's handle can be controlled at the config, resource or action level. How to handle a specific error type is determined by first checking the action, then resource, then config (host) levels.

The `errors` property can be set at any of these levels and is a set of case-sensitive error names and a literal specifying how to render the error. The literal can contain a `status` to control the status code used and a static `body`, `file` or `reply` function that takes the error as an argument and returns the content for the response body.

> Note: File is only applicable for the http transport and will be ignored in sockets.

```javascript
// this could exist in the config, a resource or an action
errors: {
	Error: {
		status: 500,
		body: 'oops'
	},
	NotFoundError: {
		status: 404,
		file: './404.html' // file is relative to the static folder
	},
	BadRequestError: {
		status: 400,
		reply: function( err ) {
			return 'This is no good: ' + err.message;
		}
	}
},
```

#### Tighter Response Control
Read the section on envelopes for details on data available and alternate ways to produce a response.

## Envelope
Envelopes are an abstraction around the incoming message or request. They are intended to help normalize interactions with a client despite the transport being used.

```javascript
// common properties/methods
{
	context: // metadata added by middleware
	cookies: // cookies on the request
	data: // the request/message body
	headers: // request or message headers
	logout: // a method to end the current session
	path: // url of the request (minus protocol/domain/port) OR message topic
	session: // session hash
	responseStream: // a write stream for streaming a response back to the client
	transport: // 'http' or 'websocket'
	version: // will check `req.context.version` - provide middleware to set this
	user: // the user attached to the request or socket
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
Sends a reply back to the requestor via HTTP or web socket. Response envelope is expected to always have a data property containing the body/reply. HTTP responses can included the following properties

 * `statusCode`: defaults to 200
 * `headers`: a hash of headers to set on the response
 * `cookies`: a hash of cookies to set on the response. The value is an object with a `value` and `options` property.
 * `data`: content of the response body

```javascript
	envelope.reply( { data: { something: 'interesting' }, statusCode: 200 } );
	// HTTP response body will be JSON { something: 'interesting' }
	// Socket.io will have a payload of { something: 'interesting' } published to the replyTo property OR the original topic
	// Websockets will get a message of { topic: replyTo|topic, data: { something: 'interesting' } }
```

> The options property for a cookie can have the following properties: `domain`, `path`, `maxAge`, `expires`, `httpOnly`, `secure`, `signed`

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
A list of NPM modules can be specified that will be loaded as resources. This feature is intended to support packages that supply a resource and static files as a sharable module. Hopefully it will lead to some interesting sharing of common APIs and/or UIs for autohost based services. (example - realtime metrics dashboard)

To enable this, simply add the module names as an array in the `modules` property of the configuration hash passed to init.

## HTTP Transport
The http transport API has three methods to add middleware, API routes and static content routes. While resources are the preferred means of adding static and API routes, it's very common to add application specific middleware. Custom middleware is added *after* standard middleware and passport (unless specific middleware was disabled via configuration).

 * `host.http.middleware( mountPath, callback, [middlewareAlias] )`
 * `host.http.route( url, callback )`
 * `host.http.static( url, filePath or options )` (See [static](#static) above for details on options)

> Note: when custom features are needed, middleware should be the preferred way to add them.

### Route prefixes
The config hash provides two optional properties to control how HTTP routes are created.

#### apiPrefix
By default autohost places all resource action routes behind `/api` to prevent any collisions with static routes. You can remove this entirely by providing an empty string or simply change it so something else.

	Note: a `urlPrefix` will always precede this if one has been supplied.

This setting can be controlled per-resource via the `apiPrefix` setting.

#### urlPrefix
In the event that a reverse proxy is in front of autohost that routes requests from a path segment to the service, use a urlPrefix to align the leading path from the original url with routes generated by autohost.

__Example__
You have a public HTTP endpoint that directs traffic to the primary application (`http://yourco.io`). You want to reverse proxy any request sent to the path `http://yourco.io/special/` to an interal application built with autohost. The challenge is that all static resources (html, css, js) that contain paths would normally use absolute paths when referencing api routes or other static resources. ( examples: `/css/style.css`, `/js/lib/jquery.min.js`, `/api/thingy/10`) The problem is that the browser will make these requests which will be directed to the original application server since instead of the `/special` path segment required to route to the autohost app via reverse proxy. This will either activate routes in the original application (which will be incorrect) _or_ get a bunch of 404s back from the front-end application.

While all of the URLs in static resources in the previous example could be prefixed with `/special', this creates a tight coupling to a reverse proxy configured exactly like production. This makes integration testing and local development unecessarily difficult.

The simpler solution is to use a `urlPrefix` set to 'special'. The prefix will automatically be applied to all routes in the service so that requests from the proxy align with the routes defined in the application consistently. This results in an application that remains usable outside of the reverse proxy and can even be built and deployed with different path prefixes (or no prefixes).

### parseAhead
Normally, middleware can't have access to path variables that aren't defined as part of its mount point. This is because the sequential routing table doesn't know what path will eventually be resolved when it's processing general purpose middleware (e.g. mounted at `/`). Setting `parseAhead` to true in configuration will add special middleware that does two things:

 * add a `preparams` property to the request with parameters from "future" matching routes
 * redefines the `req.param` function to check `preparams` before falling back to default

The upside is that general purpose middleware can access path variables instead of having to write the same kind of middleware for a lot of different paths and then worry about keeping paths synchronized. The downside is that there is obviously some performance penalty for traversing the route stack in advance like this.

## Web Socket Transport
There are two socket libraries - socket.io for browser clients and websocket-node for programmatic/server clients.

### HTTP Middleware
HTTP middleware runs during socket interactions as well. This ensures predictability in how any client is authenticated and what metadata is available within the context of activating resource actions.

### Authentication
The HTTP upgrade request is authenticated __before__ the upgrade is established. This is preferable to the standard practice of allowing a socket connection to upgrade and then checking the request or performing some client-implemented handshake after the fact.

### WebSocket-Node library
When establishing a connection to autohost using the WebSocket-Node client, append '/websocket' to the end of the URL.

### Uniform API
The differences between each library are normalized with the same set of calls:

 * `socket.publish( topic, message )` - sends a message with the topic and message contents to the socket
 * `host.socket.send( id, topic, message )` - sends message to specific client via websocket (returns true if successful)
 * `host.socket.notify( topic, message )` - sends message to all clients connected via socket

### Events
These events can be subscribed to via `host.on`:

 * 'socket.client.connected', { socket: socketConnection } - raised when a client connects
 * 'socket.client.identified', { socket: socketConnection, id: id } - raised when client reports unique id
 * 'socket.client.closed', { socket: socketConnection, id: id } - raised when client disconnects the websocket connection

## Auth - via Auth Provider
Authentication and authorization are supplied by an auth provider library that conforms to autohost's auth specifications. You can read more about that at [here](/blob/master/docs/authprovider.md).

### Programmatic control
The auth library is available by reference via the auth property on the host object: `host.auth`. Whatever API methods have been implemented are callable by the application.

### Authentication
The auth provider should supply one or more Passport strategies.

### Authorization
Roles are assigned to users and actions. If a user has a role that is in an action's list, the user can invoke that action via HTTP or a socket message. If the action has no roles assigned, there is no restriction and any authenticated user (including anonymous users) can activate the action.

The general approach is this:
 1. every action in the system is made available to the auth provider library on start-up
 1. an action may be assigned to one or more roles
 1. a user may be assigned to one or more roles
 1. when a user attempts to activate an action, the action roles are checked against the user roles
   1. if a match is found in both lists, the action completes
   1. if the user has no roles that match any of the action's roles, the action is rejected (403)
   1. if the action has NO roles assigned to it, the user will be able to activate the action

This basically goes against least-priviledge and is really only in place to prevent services from spinning up and rejecting everything. To prevent access issues, never expose a service publicly before configuring users, roles and actions.

## Logging
Logging is provided by [whistlepunk](https://github.com/LeanKit-Labs/whistlepunk) and can be controlled by the `logging` property of the config provided to the init call.

### Access Log
The access log uses the namespace `autohost.access` and logs at the `info` level. Below is a template and then an example entry:

```shell
{timestamp} autohost.access {processTitle}@{hostName} {clientIP} ({duration} ms) [{user}] {method} {requestURL} ({ingress} bytes) {statusCode} ({egress} bytes)


```

### Debugging
A lot of visibility can be gained into what's happening in autohost in real-time by setting the DEBUG environment variable. To filter down to autohost debug entries only, use `autohost*` as the DEBUG value.

```bash
	DEBUG=autohost* node index.js
```

## Metadata
Metadata describing the routes and topic are available via an OPTIONS to api:

	OPTIONS http://{host}:{port}/api

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

While this is useful, we have developed [hyped](https://github.com/LeanKit-Labs/hyped),a hypermedia library that bolts onto autohost, and [halon](https://github.com/LeanKit-Labs/halon), a browser/Node hypermedia client for consuming APIs built with `hyped`.

## Dependencies
autohost would not exist without the following libraries:

 * body-parser 		1.12.3
 * cookie-parser 	1.3.4
 * express 			4.12.3
 * express-session 	1.11.1
 * fount 			0.1.0
 * lodash 			3.7.0
 * metronic 		0.2.1
 * multer 			0.1.8
 * node-uuid 		1.4.3
 * parseurl 		1.3.0
 * passport 		0.2.1
 * postal 			1.0.2
 * qs 				2.4.1
 * request 			2.55.0
 * socket.io 		1.3.5
 * websocket 		1.0.18
 * when 			3.7.2
 * whistlepunk 		0.3.0

## TO DO
 * Add ability to define message middleware

## Contributing
There are a lot of places you can contribute to autohost. Here are just some ideas:

### Designers
 * Better designs for both the general dashboard and auth dashboard
 * Logo

### Op/Sec
I would be interested in seeing if particular Passport strategies and how they're being wired in would be subject to any exploits. Knowing this in general would be great, but especially if I'm doing something ignorant with how it's all being handled and introducing new attack vectors, I'd like to find out what those are so they can be addressed.

## License
MIT License - http://opensource.org/licenses/MIT
