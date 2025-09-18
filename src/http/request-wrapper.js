const fetch = require('node-fetch');
const { PassThrough } = require('stream');

// Minimal wrapper to mimic request's streaming API for piping responses
function request(options) {
	let url, fetchOptions = {};
	if (typeof options === 'string') {
		url = options;
	} else {
		url = options.url || options.uri;
		fetchOptions.method = options.method || 'GET';
		fetchOptions.headers = options.headers;

		if (options.body) {
			fetchOptions.body = options.json ? JSON.stringify(options.body) : options.body;

			if (options.json) {
				fetchOptions.headers = Object.assign( {}, fetchOptions.headers, { 'Content-Type': 'application/json' });
			}
		}
	}
	
	const stream = new PassThrough();
	
	fetch(url, fetchOptions)
		.then(res => {
			// Emit response event with headers and status code for proper proxying
			stream.emit('response', {
				statusCode: res.status,
				headers: res.headers.raw()
			});
			
			res.body.pipe(stream);
		} )
		.catch(err => {
			process.nextTick( () => stream.emit('error', err) );
		} );
		
	return stream;
}

module.exports = request;
