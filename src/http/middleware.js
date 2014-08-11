var bodyParser = require( 'body-parser' ),
	cookies = require('cookie-parser'),
	multer = require( 'multer' ),
	sessionLib = require( 'express-session' ),
	wrapper = {
		attach: applyMiddelware
	},
	config, metrics, session, cookieParser;

function applyMiddelware( attach ) {
	// add a timer to track ALL requests
	attach( '/', requestMetrics );

	// turn on cookies unless turned off by the consumer
	if( !config.noCookies ) {
		attach( '/', cookieParser );
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

	// turn on sessions unless turned off by the consumer
	if( !config.noSession ) {
		attach( '/', session );
	}

	// turn on cross origin unless turned off by the consumer
	if( !config.noCrossOrigin ) {
		attach( '/', crossOrigin );
	}
}

function crossOrigin( req, res, next ) {
	res.header( 'Access-Control-Allow-Origin', '*' );
	res.header( 'Access-Control-Allow-Headers', 'X-Requested-With' );
	next();
}

function requestMetrics( req, res, next ) {
	req.context = {};
	var timerKey = [ req.method.toUpperCase(), req.url, 'timer' ].join( ' ' );
	metrics.timer( timerKey ).start();
	res.on( 'finish', function() { 
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