var bodyParser = require( 'body-parser' );
var cookies = require('cookie-parser');
var sessionLib = require( 'express-session' );
var multer = require( 'multer' );
var wrapper = {
		attach: applyMiddelware,
		useCookies: applyCookieMiddleware,
		useSession: applySessionMiddleware
	};
var config, metrics, session, cookieParser;

function applyCookieMiddleware( attach ) {
	if( !config.noCookies ) {
		attach( '/', cookieParser );
	}
}

function applyMiddelware( attach, hasAuth ) {
	// add a timer to track ALL requests
	attach( '/', requestMetrics );

	if( !hasAuth ) {
		applyCookieMiddleware( attach );
	}

	// turn on body parser unless turned off by the consumer
	if( !config.noBody ) {
		attach( '/', bodyParser.urlencoded( { extended: false } ) );
		attach( '/', bodyParser.json() );
		attach( '/', bodyParser.json( { type: 'application/vnd.api+json' } ) );
		attach( '/', multer( {
			dest: config.tmp
		} ) );
	}

	if( !hasAuth ) {
		applySessionMiddleware( attach );
	}

	// turn on cross origin unless turned off by the consumer
	if( !config.noCrossOrigin ) {
		attach( '/', crossOrigin );
	}
}

function applySessionMiddleware( attach ) {
	// turn on sessions unless turned off by the consumer
	if( !config.noSession ) {
		attach( '/', session );
	}
}

function crossOrigin( req, res, next ) {
	res.header( 'Access-Control-Allow-Origin', '*' );
	res.header( 'Access-Control-Allow-Headers', 'X-Requested-With' );
	next();
}

function requestMetrics( req, res, next ) {
	req.context = {};
	res.setMaxListeners( 0 );
	var timerKey = [ req.method.toUpperCase(), req.url, 'timer' ].join( ' ' );
	metrics.timer( timerKey ).start();
	res.once( 'finish', function() { 
		metrics.timer( timerKey ).record();
	} );
	next();
}

module.exports = function( cfg, meter ) {
	config = cfg;
	metrics = meter;
	cookieParser = cookies();
	cfg.sessionStore = cfg.sessionStore || new sessionLib.MemoryStore();
	session = sessionLib( { 
		key: config.sessionId || 'sid',
		secret: config.sessionSecret || 'authostthing',
		saveUninitialized: true,
		resave: true,
		store: cfg.sessionStore
	} );
	return wrapper;
};