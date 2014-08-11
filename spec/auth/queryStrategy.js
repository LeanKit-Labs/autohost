var util = require('util'),
	Strategy = require('passport-strategy').Strategy;

function QueryStrategy( verify ) {
	Strategy.call( this );
	this.name = 'query';
	this._verify = verify;
}

util.inherits( QueryStrategy, Strategy );

QueryStrategy.prototype.authenticate = function( req, options ) {
	var self = this;
	function verified( err, user, info ) {
		if ( err ) { return self.error( err ); }
		if ( !user ) { return self.fail( info ); }
		self.success( user, info );
	}
	var token = req._query[ 'token' ];
	this._verify( token, verified );
};

module.exports = QueryStrategy;