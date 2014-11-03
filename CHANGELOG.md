## 0.3.0
Primary motivation here is to begin work on a version of autohost that will work well with a hypermedia library ( [hyped](https://github.com/leankit-labs/hyped) ). This is a breaking change because of several structural and naming changes to how resources get modeled.

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