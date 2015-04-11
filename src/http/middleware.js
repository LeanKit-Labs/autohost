var bodyParser = require( 'body-parser' );
var cookies = require( 'cookie-parser' );
var sessionLib = require( 'express-session' );
var multer = require( 'multer' );
var metronic = require( '../metrics' );
var os = require( 'os' );
var wrapper = {
	attach: applyMiddelware,
	configure: configure,
	useCookies: applyCookieMiddleware,
	useSession: applySessionMiddleware,
	sessionLib: sessionLib
};
var config, session, cookieParser, metrics;
var hostName = os.hostname();
var log = require( '../log' )( 'autohost.access' );

function applyCookieMiddleware( attach ) {
	if ( !config.noCookies ) {
		attach( '/', cookieParser );
	}
}

function applyMiddelware( attach, hasAuth ) {
	// add a timer to track ALL requests
	attach( '/', requestMetrics );

	if ( !hasAuth ) {
		applyCookieMiddleware( attach );
	}

	// turn on body parser unless turned off by the consumer
	if ( !config.noBody ) {
		attach( '/', bodyParser.urlencoded( { extended: false } ) );
		attach( '/', bodyParser.json() );
		attach( '/', bodyParser.json( { type: 'application/vnd.api+json' } ) );
		attach( '/', multer( {
			dest: config.tmp
		} ) );
	}

	if ( !hasAuth ) {
		applySessionMiddleware( attach );
	}

	// turn on cross origin unless turned off by the consumer
	if ( !config.noCrossOrigin ) {
		attach( '/', crossOrigin );
	}
}

function applySessionMiddleware( attach ) {
	// turn on sessions unless turned off by the consumer
	if ( !config.noSession ) {
		attach( '/', session );
	}
}

function crossOrigin( req, res, next ) {
	res.header( 'Access-Control-Allow-Origin', '*' );
	res.header( 'Access-Control-Allow-Headers', 'X-Requested-With' );
	next();
}

function configure( cfg ) {
	config = cfg;
	cfg.sessionStore = cfg.sessionStore || new sessionLib.MemoryStore();
	session = sessionLib( {
		name: config.sessionId || 'ah.sid',
		secret: config.sessionSecret || 'authostthing',
		saveUninitialized: true,
		resave: true,
		store: cfg.sessionStore
	} );
}

function requestMetrics( req, res, next ) {
	var ip;
	// for some edge cases, trying to access the ip/ips property
	// throws an exception, this work-around appears to avoid the
	// need to rely on try/catch
	if ( req.app ) {
		ip = req.ips.length ? req.ips[ 0 ] : req.ip ;
	} else {
		ip = req.headers[ 'X-Forwarded-For' ] || req.socket.remoteAddress;
	}
	req.context = {};
	res.setMaxListeners( 0 );
	var urlKey = req.url.slice( 1 ).replace( /[\/]/g, '-' ) + '-' + req.method.toLowerCase();
	var timer = metrics.timer( [ urlKey, 'http', 'duration' ] );

	res.once( 'finish', function() {
		var user = req.authenticatedUser;
		var method = req.method.toUpperCase();
		var read = req.connection.bytesRead;
		var readKB = read / 1024;
		var code = res.statusCode;
		var message = res.statusMessage;
		var sent = req.connection._bytesDispatched;
		var sentKB = sent ? sent / 1024 : 0;
		var url = req.url;
		var elapsed = timer.record();

		var metricKey = req._metricKey;
		if ( metricKey ) {
			var resourceRequests = metrics.meter( 'requests', metricKey );
			var resourceIngress = metrics.meter( 'ingress', metricKey );
			var resourceEgress = metrics.meter( 'egress', metricKey );
			resourceRequests.record();
			resourceIngress.record( readKB );
			resourceEgress.record( sentKB );
		} else {
			var httpRequests = metrics.meter( [ urlKey, 'requests' ] );
			var httpIngress = metrics.meter( [ urlKey, 'ingress' ] );
			var httpEgress = metrics.meter( [ urlKey, 'egress' ] );
			httpRequests.record();
			httpIngress.record( readKB );
			httpEgress.record( sentKB );
			timer.record();
		}

		log.info( '%s@%s %s (%d ms) [%s] %s %s (%d bytes) %s %s (%d bytes)',
			process.title,
			hostName,
			ip,
			elapsed,
			user || 'anonymous',
			method,
			url,
			read,
			code,
			message || '',
			sent
		);
	} );
	next();
}

module.exports = function() {
	metrics = metronic();
	cookieParser = cookies();
	return wrapper;
};
