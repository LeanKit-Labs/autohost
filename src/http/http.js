var path = require( 'path' );
var _ = require( 'lodash' );
var parseUrl = require( 'parseurl' );
var qs = require( 'qs' );
var queryparse = qs.parse;
var express = require( 'express' );
var http = require( 'http' );
var log = require( '../log' )( 'autohost.http.transport' );
var regex = require( './regex.js' );
var Router = express.Router;
var expreq = express.request;
var expres = express.response;

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

function createMiddlewareStack( state ) {
	var router = new Router();
	router
		.use( expressInit )
		.use( queryParser );
	_.each( state.systemMiddleware, function( m ) {
		m( router );
	} );
	_.each( state.userMiddleware, function( m ) {
		m( router );
	} );
	return router;
}

function createAuthMiddlewareStack( state ) {
	var router = new Router().use( expressInit ).use( queryParser );
	_.each( state.systemMiddleware, function( m ) {
		m( router );
	} );
	_.each( state.userMiddleware, function( m ) {
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

function initialize( state ) {
	var cwd = process.cwd();
	state.config.tmp = path.resolve( cwd, ( state.config.temp || './tmp' ) );

	_.each( state.systemMiddleware, function( m ) {
		m( state.app );
	} );
	// apply user-supplied middleware
	_.each( state.userMiddleware, function( m ) {
		m( state.app );
	} );
	_.each( state.routes, function( r ) {
		r();
	} );
	_.each( state.paths, function( p ) {
		p();
	} );

	if ( !state.config.noProxy ) {
		state.app.enable( 'trust proxy' );
	}
}

function initializePublicRoute( state ) {
	var cwd = process.cwd();
	var publicRoute;

	if ( state.config.static !== false ) {
		publicRoute = state.config.static || './public';
		publicRoute = typeof publicRoute === 'string' ? { path: publicRoute } : publicRoute;
		publicRoute.path = path.resolve( cwd, publicRoute.path );
		state.static( '/', publicRoute );
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
function prefix( state, url ) {
	if ( state.config.urlPrefix ) {
		if ( _.isRegExp( url ) ) {
			return regex.prefix( state.config.urlPrefix, url );
		} else {
			var prefixIndex = url.indexOf( state.config.urlPrefix );
			var appliedPrefix = prefixIndex === 0 ? '' : state.config.urlPrefix;
			return buildUrl( appliedPrefix, url );
		}
	} else {
		return url;
	}
}

function preprocessPathVariables( state, req, res, next ) {
	parseAhead( state.app._router, req, function( params ) {
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

function registerMiddleware( state, filter, callback ) {
	var fn = function( router ) {
		log.debug( 'MIDDLEWARE: %s mounted at %s', ( callback.name || 'anonymous' ), filter );
		router.use( filter, callback );
	};
	if ( state.app ) {
		fn( state.app );
	}
	state.systemMiddleware.push( fn );
}

function registerUserMiddleware( state, filter, callback ) {
	var fn = function( router ) {
		log.debug( 'MIDDLEWARE: %s mounted at %s', ( callback.name || 'anonymous' ), filter );
		router.use( filter, callback );
	};
	if ( state.app ) {
		fn( state.app );
	}
	state.userMiddleware.push( fn );
}

function registerRoute( state, url, method, callback ) {
	method = method.toLowerCase();
	method = method === 'all' || method === 'any' ? 'all' : method;
	var fn = function() {
		url = prefix( state, url );
		log.debug( 'ROUTE: %s %s -> %s', method, url, ( callback.name || 'anonymous' ) );
		state.app[ method ]( url, function( req, res ) {
			if ( state.config && state.config.handleRouteErrors ) {
				try {
					callback( req, res );
				} catch ( err ) {
					log.debug( 'ERROR! route: %s %s failed with %s', method.toUpperCase(), url, err.stack );
					res.status( 500 ).send( 'Server error at ' + method.toUpperCase() + ' ' + url );
				}
			} else {
				callback( req, res );
			}
		} );
	};
	if ( state.app ) {
		fn( state.app );
	}
	state.routes.push( fn );
}

function registerStaticPath( state, url, opt ) {
	var filePath = opt.path || opt;
	var options = typeof opt === 'string' ? {} : _.omit( opt, 'path' );

	var fn = function() {
		url = prefix( state, url );
		var target = path.resolve( filePath );
		log.debug( 'STATIC: %s -> %s', url, target );
		state.app.use( url, express.static( target, options ) );
	};
	state.paths.push( fn );
	if ( state.app ) {
		fn();
	}
}

function start( state, config, passport ) {
	state.config = config;
	state.passport = passport;
	if ( config.parseAhead ) {
		registerMiddleware( state, '/', preprocessPathVariables.bind( undefined, state ) );
	}
	// if using an auth strategy, move cookie and session middleware before passport middleware
	// to take advantage of sessions/cookies and avoid authenticating on every request
	if ( passport ) {
		state.middlewareLib.useCookies( state.middleware );
		state.middlewareLib.useSession( state.middleware );
		_.each( passport.getMiddleware( '/' ), function( m ) {
			state.middleware( m.path, m.fn );
		} );
	}
	// prime middleware with defaults
	state.middlewareLib.attach( state.middleware, passport !== undefined );

	initializePublicRoute( state );
	state.app = express();
	initialize( state );
	state.server = http.createServer( state.app );
	state.server.listen( config.port || 8800 );
	console.log( 'autohost listening on port ', ( config.port || 8800 ) );
}

function stop( state ) {
	if ( state.server ) {
		state.server.close();
		state.server = undefined;
	}
}

function reset( state ) {
	state.paths = [];
	state.routes = [];
	state.systemMmiddleware = [];
	state.userMiddleware = [];
}

module.exports = function( request, middleware ) {
	var state = {
		app: undefined,
		middlewareLib: middleware,
		passport: undefined,
		paths: [],
		request: request,
		routes: [],
		server: undefined,
		systemMiddleware: [],
		userMiddleware: []
	};
	_.merge( state, {
		buildUrl: buildUrl,
		getMiddleware: createMiddlewareStack.bind( undefined, state ),
		getAuthMiddleware: createAuthMiddlewareStack.bind( undefined, state ),
		middleware: registerUserMiddleware.bind( undefined, state ),
		reset: reset.bind( undefined, state ),
		route: registerRoute.bind( undefined, state ),
		start: start.bind( undefined, state ),
		static: registerStaticPath.bind( undefined, state ),
		stop: stop.bind( undefined, state ),
	} );
	return state;
};
