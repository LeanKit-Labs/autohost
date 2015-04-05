var _ = require( 'lodash' );
var metrics = require( 'metronic' )();

function authenticationTimer() {
	return timer( 'authentication.duration' );
}
function authorizationTimer() {
	return timer( 'authorization.duration' );
}

function getKey( key ) {
	var parts = [ 'autohost', process.title ];
	if ( _.isArray( key ) ) {
		parts = parts.concat( key );
	} else {
		parts.push( key );
	}
	return parts.join( '.' );
}

function meter( key ) {
	return metrics.meter( getKey( key ) );
}

function timer( key ) {
	return metrics.timer( getKey( key ) );
}

var api = {
	authorizationChecks: meter( 'authorization.checked' ),
	authorizationGrants: meter( 'authorization.granted' ),
	authorizationRejections: meter( 'authorization.rejected' ),
	authorizationErrors: meter( 'authorization.error' ),
	authenticationSkips: meter( 'authentication.skipped' ),
	authenticationAttempts: meter( 'authentication.attempted' ),
	authenticationGrants: meter( 'authentication.granted' ),
	authenticationRejections: meter( 'authentication.rejected' ),
	authenticationErrors: meter( 'authentication.error' ),
	authorizationTimer: authorizationTimer,
	authenticationTimer: authenticationTimer,
	timer: timer,
	meter: meter,
	getReport: metrics.getReport,
	useAdapter: metrics.useAdapter,
	useLocalAdapter: metrics.useLocalAdapter,
	removeAdapter: metrics.removeAdapter,
	recordUtilization: metrics.recordUtilization,
	cancelInterval: metrics.cancelInterval
};

module.exports = api;
