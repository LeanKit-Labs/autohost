require( '../setup' );
var logFn = require( '../../src/log' );

describe( 'when configuring log', function() {
	describe( 'before initialization', function() {
		var spy, log;
		before( function() {
			log = logFn( 'test' );
		} );

		it( 'should not throw exceptions', function() {
			spy = sinon.spy( console, 'log' );
			should.not.throw( function() {
				log.debug( 'one' );
			} );
			should.not.throw( function() {
				log.info( 'two' );
			} );
			should.not.throw( function() {
				log.warn( 'three' );
			} );
			should.not.throw( function() {
				log.error( 'four' );
			} );
			console.log.restore();
		} );

		it( 'should not call adapters', function() {
			spy.callCount.should.equal( 0 );
		} );
	} );

	describe( 'after initialization', function() {
		var spy, log;
		before( function() {
			log = logFn( 'test' );
		} );

		it( 'should not throw exceptions', function() {
			spy = sinon.spy( console, 'log' );
			should.not.throw( function() {
				log.debug( 'one' );
			} );
			should.not.throw( function() {
				log.info( 'two' );
			} );
			should.not.throw( function() {
				log.warn( 'three' );
			} );
			should.not.throw( function() {
				log.error( 'four' );
			} );
			console.log.restore();
		} );

		it( 'should not call adapters', function() {
			spy.callCount.should.equal( 0 );
		} );
	} );
} );
