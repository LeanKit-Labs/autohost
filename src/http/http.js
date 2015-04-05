var path = require( 'path' );
var _ = require( 'lodash' );
var parseUrl = require( 'parseurl' );
var qs = require( 'qs' );
var queryparse = qs.parse;
var express = require( 'express' );
var http = require( 'http' );
var debug = require( 'debug' )( 'autohost:http-transport' );
var regex = require( './regex.js' );
var Router = express.Router;
var expreq = express.request;
var expres = express.response;
var middleware, userMiddleware, routes, paths, request, config, middlewareLib;

var wrapper;
reset();

function buildUrl() {
	var idx = 0,
		cleaned = [],
		segment;
	while ( idx < arguments.length ) {
		segment = arguments[ idx ];
		if ( segment.substr( 0, 1 ) === '/' ) {
			segment = segment.substr( 1 );
		}
		if ( segment.substr( segment.length - 1, 1 ) === '/' ) {
			segment = segment.substring( 0, segment.length - 1 );
		}
		if ( !_.isEmpty( segment ) ) {
			cleaned.push( segment );
		}
		idx++;
	}
	return cleaned.length ? '/' + cleaned.join( '/' ) : '';
}

function createMiddlewareStack() {
	var router = new Router();
	router
		.use( expressInit )
		.use( queryParser );
	_.each( middleware, function( m ) {
		m( router );
	} );
	_.each( userMiddleware, function( m ) {
		m( router );
	} );
	return router;
}

function createAuthMiddlewareStack() {
	var router = new Router().use( expressInit ).use( queryParser );
	_.each( middleware, function( m ) {
		m( router );
	} );
	_.each( userMiddleware, function( m ) {
		m( router );
	} );
	return router;
}

// adaptation of express's initializing middleware
// the original approach breaks engine-io
function expressInit( req, res, next ) {
	req.next = next;
	req.context = {};
	// patching this according to how express does it
	// not jshint ignoring the following lines because then it
	// warns that expreq and expres aren't used.
	// This works according to express implemenetation
	// DO NOT CHANGE IT
	req.__proto__ = expreq;
	res.__proto__ = expres;

	next();
}

function initialize() {
	var cwd = process.cwd();
	config.tmp = path.resolve( cwd, ( config.temp || './tmp' ) );

	_.each( middleware, function( m ) {
		m( wrapper.app );
	} );
	// apply user-supplied middleware
	_.each( userMiddleware, function( m ) {
		m( wrapper.app );
	} );
	_.each( routes, function( r ) {
		r();
	} );
	_.each( paths, function( p ) {
		p();
	} );
}

function initializePublicRoute() {
	var cwd = process.cwd();
	var publicRoute;

	if ( config.static !== false ) {
		publicRoute = config.static || './public';
		publicRoute = typeof publicRoute === 'string' ? { path: publicRoute } : publicRoute;
		publicRoute.path = path.resolve( cwd, publicRoute.path );
		wrapper.static( '/', publicRoute );
	}
}

// this might be the worst thing to ever happen to anything ever
// this is adapted directly from express layer.match
function parseAhead( router, req, done ) {
	var idx = 0;
	var stack = router.stack;
	var params = {};
	var method = req.method ? req.method.toLowerCase() : undefined;
	next();

	function next() {
		var layer = stack[ idx++ ];
		if ( !layer ) {
			// strip dangling query params
			params = _.transform( params, function( acc, v, k ) {
				acc[ k ] = v.split( '?' )[ 0 ]; return acc;
			}, {} );
			return done( params );
		}

		if ( layer.method && layer.method !== method ) {
			return next();
		}
		layer.match( req.originalUrl );
		params = _.merge( params, layer.params );
		next();
	}
}

// apply prefix to url if one exists
function prefix( url ) {
	if ( config.urlPrefix ) {
		if ( _.isRegExp( url ) ) {
			return regex.prefix( config.urlPrefix, url );
		} else {
			var prefixIndex = url.indexOf( config.urlPrefix );
			var appliedPrefix = prefixIndex === 0 ? '' : config.urlPrefix;
			return buildUrl( appliedPrefix, url );
		}
	} else {
		return url;
	}
}

function preprocessPathVariables( req, res, next ) {
	parseAhead( wrapper.app._router, req, function( params ) {
		var original = req.param;
		req.preparams = params;
		req.param = function( name, dflt ) {
			return params[ name ] || original( name, dflt );
		};
		next();
	} );
}

// Internal query-parsing middleware from express
// (not exposed, so copied here)
function queryParser( req, res, next ) {
	if ( !req.query ) {
		var val = parseUrl( req ).query;
		req.query = queryparse( val );
	}
	next();
}

function registerMiddleware( filter, callback ) {
	var fn = function( router ) {
		debug( 'MIDDLEWARE: %s mounted at %s', ( callback.name || 'anonymous' ), filter );
		router.use( filter, callback );
	};
	if ( wrapper.app ) {
		fn( wrapper.app );
	}
	middleware.push( fn );
}

function registerUserMiddleware( filter, callback ) {
	var fn = function( router ) {
		debug( 'MIDDLEWARE: %s mounted at %s', ( callback.name || 'anonymous' ), filter );
		router.use( filter, callback );
	};
	if ( wrapper.app ) {
		fn( wrapper.app );
	}
	userMiddleware.push( fn );
}

function registerRoute( url, method, callback ) {
	method = method.toLowerCase();
	method = method === 'all' || method === 'any' ? 'all' : method;
	var errors = [ 'autohost', 'errors', method.toUpperCase() + ' ' + url ].join( '.' );
	var fn = function() {
		url = prefix( url );
		debug( 'ROUTE: %s %s -> %s', method, url, ( callback.name || 'anonymous' ) );
		wrapper.app[ method ]( url, function( req, res ) {
			if ( config && config.handleRouteErrors ) {
				try {
					callback( req, res );
				} catch ( err ) {
					debug( 'ERROR! route: %s %s failed with %s', method.toUpperCase(), url, err.stack );
					res.status( 500 ).send( 'Server error at ' + method.toUpperCase() + ' ' + url );
				}
			} else {
				callback( req, res );
			}
		} );
	};
	if ( wrapper.app ) {
		fn( wrapper.app );
	}
	routes.push( fn );
}

function registerStaticPath( url, opt ) {
	var filePath = opt.path || opt;
	var options = typeof opt === 'string' ? {} : _.omit( opt, 'path' );

	var fn = function() {
		url = prefix( url );
		var target = path.resolve( filePath );
		debug( 'STATIC: %s -> %s', url, target );
		wrapper.app.use( url, express.static( target, options ) );
	};
	paths.push( fn );
	if ( wrapper.app ) {
		fn();
	}
}

function start( cfg, pass ) {
	config = cfg;
	wrapper.passport = pass;
	if ( cfg.parseAhead ) {
		registerMiddleware( '/', preprocessPathVariables );
	}
	// if using an auth strategy, move cookie and session middleware before passport middleware
	// to take advantage of sessions/cookies and avoid authenticating on every request
	if ( pass ) {
		middlewareLib.useCookies( registerMiddleware );
		middlewareLib.useSession( registerMiddleware );
		_.each( wrapper.passport.getMiddleware( '/' ), function( m ) {
			registerMiddleware( m.path, m.fn );
		} );
	}
	// prime middleware with defaults
	middlewareLib.attach( registerMiddleware, pass !== undefined );

	initializePublicRoute();
	wrapper.app = express();
	initialize();
	wrapper.server = http.createServer( wrapper.app );
	wrapper.server.listen( config.port || 8800 );
	console.log( 'autohost listening on port ', ( config.port || 8800 ) );
}

function stop() {
	if ( wrapper.server ) {
		wrapper.server.close();
		wrapper.server = undefined;
	}
}

function reset() {
	wrapper = {
		buildUrl: buildUrl,
		getMiddleware: createMiddlewareStack,
		getAuthMiddleware: createAuthMiddlewareStack,
		middleware: registerUserMiddleware,
		route: registerRoute,
		start: start,
		static: registerStaticPath,
		server: undefined,
		app: undefined,
		passport: undefined,
		stop: stop
	};
	middleware = [];
	userMiddleware = [];
	routes = [];
	paths = [];
}

module.exports = function( req, mw, resetState ) {
	if ( resetState ) {
		reset();
	}
	request = req;
	middlewareLib = mw;

	return wrapper;
};
