var _ = require( 'lodash' );
var container = {};
module.exports = function( Host ) {
	Host.prototype.register = function( key, value ) {
		container[ key ] = value;
	};

	Host.prototype.resolve = function( key ) {
		var val = container[ key ],
			args = Array.prototype.slice.call( arguments, 1 );
		return _.isFunction( val ) ? val.apply( null, args ) : val;
	};
};