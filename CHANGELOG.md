## 0.3.0
Primary motivation here is to begin work on a version of autohost that will work well with a hypermedia library ( [hyped](https://github.com/leankit-labs/hyped) ). This is a breaking change because of several structural and naming changes to how resources get modeled.

### prerelease 1

* Redesign of resource format
* Addition of extension points
* Init now returns a promise with a list of loaded resources
* Add ability to disable built-in options middleware

### prerelease 2

Eliminate "feature" that prefixes action URLs with resource name.

## 0.2.0
Rewritten from scratch to address several design flaws and lack of testability in the library. New design focuses on a general approach to resource handling and then passing off loaded resources to various transport adapters which then determine how to route incoming requests/messages to the correct resource/action.