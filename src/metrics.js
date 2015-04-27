var _ = require( 'lodash' );
var metrics = {};

function configure( config ) {
	if ( config || !metrics.instrument ) {
		var instance;
		metrics = {};
		if ( config && config.instrument ) {
			instance = config;
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
}

module.exports = configure;
