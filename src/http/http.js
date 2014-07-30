var path = require( 'path' ),
	_ = require( 'lodash' ),
	parseUrl = require( 'parseurl' ),
	qs = require( 'qs' ),
	express = require( 'express' ),
	http = require( 'http' ),
	debug = require( 'debug' )( 'autohost:http-transport' ),
	Router = express.Router,
	expreq = express.request,
	expres = express.response,
	queryparse = qs.parse,
	middleware = [],
	routes = [],
	paths = [],
	request, 
	config, 
	metrics,
	middlewareLib;

var wrapper = {
	getMiddleware: createMiddlewareStack,
	getAuthMiddleware: createAuthMiddlewareStack,
	middleware: registerMiddleware,
	route: registerRoute,
	start: start,
	static: registerStaticPath,
	server: undefined,
	app: undefined,
	passport: undefined,
	stop: stop
};

function createMiddlewareStack() {
	var router = new Router();
	router
		.use( expressInit )
		.use( queryParser );
	_.each( middleware, function( m ) {
		m( router );
	} );
	return router;
}

function createAuthMiddlewareStack() {
	var router = new Router().use( expressInit );
	_.each( wrapper.passport.getMiddleware( '/' ), function( m ) {
		router.use( m.path, m.fn );
	} );
	return router;
}

// adaptation of express's initializing middleware
// the original approach breaks engine-io
function expressInit( req, res, next ) {
    req.next = next;
    req.__proto__ = expreq;
    res.__proto__ = expres;
    next();
}

function initialize( authStrategy ) {
	var cwd = process.cwd(),
		public = path.resolve( cwd, ( config.static || './public' ) );
	config.tmp = path.resolve( cwd, ( config.temp || './tmp' ) );

	registerStaticPath( '/', public );

	// prime middleware with defaults
	middlewareLib.attach( registerMiddleware );

	wrapper.passport.wireupPassport( wrapper );

	// apply user-supplied middleware
	_.each( middleware, function( m ) { m( wrapper.app ); } );
	_.each( routes, function( r ) { r(); } );
	_.each( paths, function( p ) { p(); } );
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
	middleware.push( function( target ) {
		debug( 'MIDDLEWARE: %s mounted at %s', ( callback.name || 'anonymous' ), filter );
		target.use( filter, callback );
	} );
}

function registerRoute( url, verb, callback ) {
	verb = verb.toLowerCase();
	verb = verb == 'all' || verb == 'any' ? 'all' : verb;
	var errors = [ url, verb, 'errors' ].join( '.' );
	routes.push( function() {
		debug( 'ROUTE: %s %s -> %s', verb, url, ( callback.name || 'anonymous' ) );
		wrapper.app[ verb ]( url, function( req, res ) {
			try {
				callback( req, res );
			} catch ( err ) {
				metrics.meter( errors ).record();
				debug( 'ERROR! route: %s %s failed with %s', verb, url, err.stack );
			}
		} );
	} );
}

function registerStaticPath( url, filePath ) {
	paths.push( function() {
		var target = path.resolve( filePath );
		debug( 'STATIC: %s -> %s', url, target );
		wrapper.app.use( url, express[ 'static' ]( target ) );
	} );
}

function start( authStrategy ) {
	initialize( authStrategy );
	wrapper.server = http.createServer( wrapper.app );
	wrapper.server.listen( config.port || 8800 );
	console.log( 'autohost listening on port ', ( config.port || 8800 ) );
}

function stop() {
	wrapper.app._router = undefined;
	wrapper.server.close();
	routes = [];
	paths = [];
	middleware = [];
}

module.exports = function( cfg, req, pass, mw, metric ) {
	config = cfg;
	metrics = metric;
	request = req;
	wrapper.passport = pass;
	wrapper.app = express();
	middlewareLib = mw;
	return wrapper;
};