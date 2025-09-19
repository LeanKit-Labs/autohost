const fetch = require('node-fetch');

// Simple cookie jar implementation
class CookieJar {
  constructor() {
    this.cookies = new Map(); // domain -> cookie string
  }
  
  storeCookies(url, setCookieHeaders) {
    if (!setCookieHeaders || !Array.isArray(setCookieHeaders)) return;
    
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Simple cookie storage - just store the raw cookie strings
    const existingCookies = this.cookies.get(domain) || [];
    const newCookies = [...existingCookies];
    
    setCookieHeaders.forEach(cookieHeader => {
      // Extract just the name=value part (ignore path, domain, expires, etc.)
      const cookiePart = cookieHeader.split(';')[0];
      const [name] = cookiePart.split('=');
      
      // Remove any existing cookie with the same name
      const filtered = newCookies.filter(existing => !existing.startsWith(name + '='));
      filtered.push(cookiePart);
      newCookies.splice(0, newCookies.length, ...filtered);
    });
    
    this.cookies.set(domain, newCookies);
  }
  
  getCookies(url) {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const cookies = this.cookies.get(domain) || [];
    return cookies.join('; ');
  }
}

// Simple request-compatible wrapper for integration tests
function requestWrapper(options, callback) {
  if (typeof options === 'string') {
    options = { url: options };
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {},
    redirect: 'manual'  // Handle redirects manually to capture redirect responses
  };

  // Convert all header values to strings
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      fetchOptions.headers[key] = String(value);
    }
  }

  // Handle cookie jar if enabled
  if (options.jar && options.jar.getCookies) {
    const existingCookies = options.jar.getCookies(options.url || options.uri);
    if (existingCookies) {
      fetchOptions.headers['Cookie'] = existingCookies;
    }
  }

  // Only add body for non-GET/HEAD methods
  if (options.method && options.method.toUpperCase() !== 'GET' && options.method.toUpperCase() !== 'HEAD') {
    if (options.json === true && options.body) {
      // When json: true with body, send body as JSON
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    } else if (options.form) {
      fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      fetchOptions.body = new URLSearchParams(options.form).toString();
    } else if (options.json && typeof options.json === 'object') {
      // When json is an object, send it as JSON
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.json);
    } else if (options.body) {
      fetchOptions.body = options.body;
    }
  }

  const promise = fetch(options.url || options.uri, fetchOptions)
    .then(response => {
      // Handle redirects if followRedirect callback is provided
      if (response.status >= 300 && response.status < 400 && options.followRedirect) {
        const redirectInfo = {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries())
        };
        
        const shouldFollow = options.followRedirect(redirectInfo);
        if (shouldFollow && response.headers.get('location')) {
          // Follow the redirect - create a promise for recursive call
          const redirectOptions = Object.assign({}, options, {
            url: response.headers.get('location')
          });
          
          // Recursive call without callback to get promise chain
          return requestWrapper(redirectOptions);
        }
      }
      
      return response.text().then(body => {
        let parsedBody = body;
        const contentType = response.headers.get('content-type') || '';
        
        // Only parse JSON if explicitly requested with json: true
        if (options.json === true) {
          try {
            parsedBody = JSON.parse(body);
          } catch (e) {
            // If JSON parsing fails, keep as string
            parsedBody = body;
          }
        }

        const result = {
          statusCode: response.status,
          headers: {},
          body: parsedBody
        };

        // Convert headers to object, handling set-cookie specially  
        for (const [key, value] of response.headers.entries()) {
          result.headers[key] = value;
        }
        
        // Handle set-cookie headers as array (use raw() to get proper array)
        const rawHeaders = response.headers.raw();
        if (rawHeaders['set-cookie']) {
          result.headers['set-cookie'] = rawHeaders['set-cookie'];
          
          // Store cookies in jar if enabled
          if (options.jar && options.jar.storeCookies) {
            options.jar.storeCookies(options.url || options.uri, rawHeaders['set-cookie']);
          }
        }

        return result;
      });
    })
    .then(result => {
      // Call callback with final result (after any redirects)
      if (callback) {
        callback(null, result, result.body);
      }
      return result;
    })
    .catch(error => {
      if (callback) {
        callback(error);
      } else {
        throw error;
      }
    });

  // Always return the promise, even if callback is provided
  return promise;
}

// Add HTTP method convenience functions
requestWrapper.get = function(options, callback) {
  if (typeof options === 'string') {
    options = { url: options };
  }
  options.method = 'GET';
  return requestWrapper(options, callback);
};

requestWrapper.post = function(options, callback) {
  if (typeof options === 'string') {
    options = { url: options };
  }
  options.method = 'POST';
  return requestWrapper(options, callback);
};

requestWrapper.put = function(options, callback) {
  if (typeof options === 'string') {
    options = { url: options };
  }
  options.method = 'PUT';
  return requestWrapper(options, callback);
};

requestWrapper.del = function(options, callback) {
  if (typeof options === 'string') {
    options = { url: options };
  }
  options.method = 'DELETE';
  return requestWrapper(options, callback);
};

// Add defaults method for jar support simulation
requestWrapper.defaults = function(defaultOptions) {
  // Create a shared cookie jar if jar: true is specified
  const sharedCookieJar = defaultOptions.jar === true ? new CookieJar() : null;
  
  const newWrapper = function(options, callback) {
    if (typeof options === 'string') {
      options = { url: options };
    }
    const mergedOptions = Object.assign({}, defaultOptions, options);
    
    // Replace jar: true with the actual jar instance
    if (mergedOptions.jar === true && sharedCookieJar) {
      mergedOptions.jar = sharedCookieJar;
    }
    
    return requestWrapper(mergedOptions, callback);
  };
  
  // Copy method functions to the new wrapper
  newWrapper.get = function(options, callback) {
    if (typeof options === 'string') {
      options = { url: options };
    }
    const mergedOptions = Object.assign({}, defaultOptions, options);
    mergedOptions.method = 'GET';
    
    // Replace jar: true with the actual jar instance
    if (mergedOptions.jar === true && sharedCookieJar) {
      mergedOptions.jar = sharedCookieJar;
    }
    
    return requestWrapper(mergedOptions, callback);
  };
  
  newWrapper.post = function(options, callback) {
    if (typeof options === 'string') {
      options = { url: options };
    }
    const mergedOptions = Object.assign({}, defaultOptions, options);
    mergedOptions.method = 'POST';
    
    // Replace jar: true with the actual jar instance
    if (mergedOptions.jar === true && sharedCookieJar) {
      mergedOptions.jar = sharedCookieJar;
    }
    
    return requestWrapper(mergedOptions, callback);
  };
  
  newWrapper.put = function(options, callback) {
    if (typeof options === 'string') {
      options = { url: options };
    }
    const mergedOptions = Object.assign({}, defaultOptions, options);
    mergedOptions.method = 'PUT';
    
    // Replace jar: true with the actual jar instance
    if (mergedOptions.jar === true && sharedCookieJar) {
      mergedOptions.jar = sharedCookieJar;
    }
    
    return requestWrapper(mergedOptions, callback);
  };
  
  newWrapper.del = function(options, callback) {
    if (typeof options === 'string') {
      options = { url: options };
    }
    const mergedOptions = Object.assign({}, defaultOptions, options);
    mergedOptions.method = 'DELETE';
    
    // Replace jar: true with the actual jar instance
    if (mergedOptions.jar === true && sharedCookieJar) {
      mergedOptions.jar = sharedCookieJar;
    }
    
    return requestWrapper(mergedOptions, callback);
  };
  
  return newWrapper;
};

module.exports = requestWrapper;