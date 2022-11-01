## 3.x

### 3.0.0

* Removed unused dependencies
* Updated multer
* Updated whistlepunk
* Updated passport and conditionally add passport session middleware based on changes to passport
* Updated socket.io
* Updated passport to 0.5.3
* Updated query-string dep
* Updated sinon/chai related deps
* Updated more dev deps
* Updated some dev deps
* Added a few updated dependencies
* Updated to latest semver versions
* Removed a couple of unneeded dependencies
* Updated node version

## 2.x

### 2.0.0

* Updated project dependencies and security issues

## 1.x

### 1.2.0

* Fixed tests for new enable value.
* Changed to an enable flag, enableAccessLogs, that defaults to true when undefined.
* Add option to disable access logs

### 1.1.0

* Named the main route handler function for better reporting in New Relic and similar tools

### 1.0.0

* change order of operations of merge operations into `data` to prefer url parameter, then request body, then parameter
* request body is deep cloned to the data propert on HttpEnvelope to avoid
* add query, parameter, and body properties to envelope

## 0.6.x

### 0.6.2
 * Bug fix - change order of merge operations into `data` to prefer url parameter, then request body, then query parameter.
 * Bug fix - clone request body to data property on envelope; do not copy reference and allow mutation
 * Improvement - add query, parameter and body properties to envelope

### 0.6.1

 * Add ability to define multiple URL patterns per action
 * Add support for differentiated authorization (support versioned authorization in hyped)

### 0.6.0

* Removed Express.js warning when not using sessions

## 0.5.x

### 0.5.12

* Updated socket.io to 1.4.5 and websocket to 1.0.22

### 0.5.11

 * Fixes around socket connection bookkeeping

### 0.5.10

 * Regex fix for newer version of node

### 0.5.9
 * Better default error logging for 5xx errors
 * Minor tweak to prevent posting two timing metrics for resource actions called via HTTP

### 0.5.8
 * Add differentiated handle feature (to support adding versioned handlers in hyped)

### 0.5.7

 * Fixed issue with data objects having no hasOwnProperty function

### 0.5.6
 * Provide a means to customize socket.io configuration
 * Update dependencies
   * change dependency on qs to query-string
   * update multer usage to adapt to new API

### 0.5.5
 * Allow auth errors to bubble up to the default error handler (or custom error handlers)

### 0.5.4
 * Fixed an issue where resource modules that return a promise for a resource were not having their relative path set

### 0.5.3
 * Fixed issue where cors config was not properly accessed in middleware

### 0.5.2
 * Added ability to configure Access-Allow headers via top level config
 * Added JSCS configuration file
 * Skipped auth on options calls

### 0.5.1
 * Bug fix - error results not getting rendered correctly from hyped
 * Change default error strategy to use an object with a `message` property to match other AH default responses
 * No longer return errors as message body (too dangerous a default behavior)
 * Add `method` property to httpEnvelope
 * Remove demo and dependencies on auth provider libraries

### 0.5.0
 * A query string value can no longer override a URL parameter (Matches behavior of the `data` object)
 * Correct issue where insufficient parameters were passed to authorize predicates in hyped
 * Default authorization (permission) checks to the end of all middleware
 * Allow a placeholder to control when authorization checks occur in middleware stacks
 * Return JSON `{ message: ... }` for all error responses
 * Fix issue where express middleware that responds with an error code did not end HTTP stack evaluation

### 0.4.7
 * Add authorize predicate to resource actions to support alternate authorization approach

### 0.4.6
 * Add resource and action middleware abstraction
 * Minor corrections to existing README for previous features

### 0.4.5
Enhancement - getUserString is now shared as an overrideable global config option

### 0.4.4
Bug fix - getRoles was incorrectly being treated as error handling middleware

### 0.4.3

 * Add metadata to metrics to provide a unique name for each metric collected
 * Bug fix - prevent default metronic instance from being used when user provides one via config

### 0.4.2

 * Bug fix - authenticated users don't show up in access log correctly on consecutive calls
 * Remove authenticatedUser property from request

### 0.4.1

 * API Change - host now requires `start` to start the server
 * authProvider is now a config property
 * Bug fix - undefined config would throw an error instead of using all defaults
 * Bug fix - correct registration of system middleware as user middleware
 * Remove support for incorrectly nested user property on request object
 * Added support for handling generic errors
 * Support returning static files as error responses
 * Added aliases for anonymous middleware for better debug logging
 * Rework harness to rely on index
 * Expose harness via 'autohost/harness'

### 0.4.0

 * Improve control over session and session cookie configuration
 * Bug fix - socket.io adapter re-attached authentication middleware on every connection
 * Minor improvement to logging abstraction and updates to specs still using debug
 * Refactored module-level state out of modules
 * Support object literal syntax for resource action handles
 * Support custom error handling

## 0.3.x
Primary motivation here is to begin work on a version of autohost that will work well with a hypermedia library ( [hyped](https://github.com/leankit-labs/hyped) ). This is a breaking change because of several structural and naming changes to how resources get modeled.

### 0.3.2

 * Bug fix - multiple modules were incorrectly passing config to metronic

### 0.3.1
 * Update metronic version to 0.2.0
 * Bug fix - resolving external resource modules should correctly differentiate between relative paths and NPM modules

### 0.3.0
 * Use metronic for metrics
 * Use whistlepunk for logging
 * Add access logging
 * Improve metrics collection
 * Update load of relative module paths to resolve against process current working directory

### prerelease 25
 * Updated two remaining areas where apiPrefix wouldn't be honored if empty
 * Add ability to override apiPrefix for a resource

### prerelease 24
 * Add ability to turn off the default static path handler with `static: false`
 * Add ability to pass additional options to static with `static: { ... }`
 * Bug fix - The static path is now only created once, at the end of all other static paths

### prerelease 23
Update tests and dependencies to support Node 0.10.* and 0.12.*

### prerelease 22
Bug fix - autohost accidentally pegged fount version and bad initialization order caused custom fount instances to get ignored.

### prerelease 21
Bug fix - correct problem with how express-session was exposed causing connect-redis to fail on init.

### prerelease 20
 * Add unique identifiers to socket connections
 * Update assertions to chai
 * Re-org specs

### prerelease 19
Allow for specs to reset userCountCheck so that the auth providers can be reset after adding or removing accounts and get expected behavior.

### prerelease 18
 * Rewrite specifications
 * Provide test harness
 * Get coverage to 90%
 * Improve metrics keys / namespaces
 * Bring socket abstractions up to feature parity with HTTP where possible
 * Provide better error responses when trying to forward or redirect from a socket activation of an action
 * Correctly capture user for socket.io
 * Preserve header values from UPGRADE request during socket connection
 * Fix socket stream implementation (streaming to client via socket)


### prerelease 17
Add `.logout` to to HTTP and Socket envelopes to make ending a session within a handler more straight-forward.

### prerelease 16
 * Bug fix - public path was getting registered before middleware causing static resources under public to get served regardless of authorization.
 * Formatting (esformatter and then manual clean up)

### prerelease 15
Bug fix - passport should not attempt to initialize when no auth provider is passed to init.

### prerelease 14
 * Bug fix - auth middleware shouldn't get added to sockets twice
 * Bug fix - user middleware should always come after auth middleware
 * Simplify passport and http module interaction
 * Fix broken socket.io authentication in ws.adapter.spec
 * Add istanbul to gulpfile

### prerelease 13
Bug fixes. Bug fixes everywhere:
 * Middleware wasn't correctly supporting 'eager' route definition
 * Shifted Passport creation closer to actual usage
 * Put missing demo dependencies into package file

### prerelease 12
 * Do not set defaults on AutoHost's request instance
 * Make try/catch opt-in for route handles
 * Return 500 error when handle throws exception and using error handling for routes
 * Allow definition of routes before calling init
 * Support header setting on envelope reply
 * Support cookies on envelope reply

### prerelease 11
 * Added opt-in feature that pre-parses path variables for access within middelware. This could be terrible.
 * Pass req.context to auth provider getUserRoles when calling from passport middleware.

### prerelease 10
Pass user object to auth libs vs. user.name.

### prerelease 9
Fix edge case causing passport middleware to re-authenticate users already in the session if the user object didn't have a `name` property.

### prerelease 8
 * Remove the _autohost API/UI
 * Pass request context to checkPermissions call to enable contextual authorization

### prerelease 7
 * Add support for returning multiple resources from a single resource file
 * Add support for a resource-level URL prefix

### prerelease 6
Bug fix causing regular expression URLs to get incorrectly prefixed with '/' when no api or url prefix was specified.

### prerelease 5
Bug fix for regular expression urls in the resource action. Add feature to prefix regular expressions with url and api prefixes.

### prerelease 4
Bug fix to prevent duplication of url and/or api prefixes when using a urlStrategy (as with hyped).

### prerelease 3
This prerelease changes the timing of how autohost loads resources and when they're passed on to adapters. This was done because of how hyped needs to have all resources available when constructing urls for child resources: the parent resource must be available in order to get its self url.

These changes allow hyped style period delimited path variables to be used in the resource definition while handing off a camel-case version of the variable to express (since it doesn't grok period delimited path variables).

 * Add ability to supply url generation strategy (for use with hyped)
 * Refactor resource loading so that all resources are loaded before being passed on to the adapters

### prerelease 2

Eliminate "feature" that prefixes action URLs with resource name - ultimately a bit of a dead end...

### prerelease 1

* Redesign of resource format
* Addition of extension points
* Init now returns a promise with a list of loaded resources
* Add ability to disable built-in options middleware



## 0.2.0
Rewritten from scratch to address several design flaws and lack of testability in the library. New design focuses on a general approach to resource handling and then passing off loaded resources to various transport adapters which then determine how to route incoming requests/messages to the correct resource/action.
