## 0.3.0
Primary motivation here is to begin work on a version of autohost that will work well with a hypermedia library ( [hyped](https://github.com/leankit-labs/hyped) ). This is a breaking change because of several structural and naming changes to how resources get modeled.

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
