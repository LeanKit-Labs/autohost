var _ = require( 'lodash' );
var postal = require( 'postal' );
var logFn = require( 'whistlepunk' );
var logger = logFn( postal, {} );
var logs = {};
var topics = [];

function configure( config ) {
	var envDebug = !!process.env.DEBUG;
	if ( envDebug ) {
		logger = logFn( postal, { adapters: { debug: { level: 5 } } } );
	} else {
		logger = logFn( postal, config );
	}

	_.each( logs, function( log ) {
		log.reset();
	} );
	logs = {};
	_.each( topics, createLog );
}

function createLog( topic ) {
	var log = logger( topic );
	if ( log[ topic ] ) {
		log[ topic ].reset();
	}
	topics.push( log );
	log = log;
	return log;
}

module.exports = function( config, ns ) {
	if ( typeof config === 'string' ) {
		ns = config;
	} else {
		configure( config );
	}
	return ns ? createLog( ns ) : createLog;
};
