var _ = require( 'lodash' );
var metrics = {};

module.exports = function( config ) {
	if ( config || !metrics.instrument ) {
		var instance;
		if ( config && config.metrics ) {
			instance = config.metrics;
		} else {
			instance = require( 'metronic' )( config );
		}
		var api = {
			authorizationAttempts: instance.meter( 'authorization-attempted' ),
			authorizationErrors: instance.meter( 'authorization-failed' ),
			authorizationGrants: instance.meter( 'authorization-granted' ),
			authorizationRejections: instance.meter( 'authorization-rejected' ),
			authenticationAttempts: instance.meter( 'authentication-attempted' ),
			authenticationErrors: instance.meter( 'authentication-failed' ),
			authenticationGrants: instance.meter( 'authentication-granted' ),
			authenticationRejections: instance.meter( 'authentication-rejected' ),
			authenticationSkips: instance.meter( 'authentication-skipped' ),
			authorizationTimer: function() {
				return instance.timer( 'authorizing' );
			},
			authenticationTimer: function() {
				return instance.timer( 'authenticating' );
			}
		};
		_.merge( metrics, instance, api );
	}
	return metrics;
};
