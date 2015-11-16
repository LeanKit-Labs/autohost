var mwFactory = require( '../../src/http/middleware' );

describe( 'Middleware', function() {
	var sessionLibStub;
	before( function() {
		sessionLibStub = function() {};
		sessionLibStub.MemoryStore = function() {};
	} );
	describe( 'CORs configuration - defaults', function() {
		var mw;
		before( function() {
			mw = mwFactory( sessionLibStub );
			mw.configure( {} );
		} );
		it( 'Should return expected defaults', function() {
			mw.config.cors.should.eql( {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'X-Requested-With,Authorization',
				'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,DELETE'
			} );
		} );
	} );
	describe( 'CORs configuration - custom', function() {
		var mw;
		before( function() {
			mw = mwFactory( sessionLibStub );
			mw.configure( {
				cors: {
					'Test-Header-Stuff': 'Sudo Make Me a Sandwich',
					'Access-Control-Allow-Origin': 'ANYBUDDY'
				}
			} );
		} );
		it( 'Should add custom header values', function() {
			mw.config.cors.should.eql( {
				'Test-Header-Stuff': 'Sudo Make Me a Sandwich',
				'Access-Control-Allow-Origin': 'ANYBUDDY',
				'Access-Control-Allow-Headers': 'X-Requested-With,Authorization',
				'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,DELETE'
			} );
		} );
	} );
} );
