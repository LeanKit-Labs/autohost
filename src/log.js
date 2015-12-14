var _ = require( 'lodash' );
var logFn = require( 'whistlepunk' ).log;
logFn( {} );
module.exports = function( config, ns ) {
	if( process.env.DEBUG ) {
		ns = _.isString( config ) ? config : ns;
		return ns ? logFn( ns ) : logFn;
	} else {
		return logFn( config, ns );
	}
};
