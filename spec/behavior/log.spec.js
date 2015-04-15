require( '../setup' );
var logFn = require( '../../src/log' );
var mockLog = require( '../mockLogger' )();

function stubOutput() {
	// the DEBUG library uses stderr or stdout
	// but not console.log
	var stdout = process.stderr;
	return sinon.stub( stdout, 'write' );
}

describe( 'when configuring log', function() {
	describe( 'before initialization', function() {
		var spy, log;
		before( function() {
			log = logFn( 'test' );
		} );

		it( 'should not throw exceptions', function() {
			spy = stubOutput();
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
		} );

		it( 'should not call adapters', function() {
			spy.callCount.should.equal( 0 );
		} );

		after( function() {
			spy.restore();
		} );
	} );

	describe( 'with debug env set', function() {
		var original = process.env.DEBUG;
		var spy, log;
		before( function() {
			var stdout = process.stderr;
			spy = sinon.stub( stdout, 'write' );
			process.env.DEBUG = 'test';
			log = logFn( {
				adapters: {
					'./spec/mockLogger.js': {
						level: 5
					}
				}
			}, 'test' );
			log.debug( 'hello' );
			log.info( 'ignored' );
			log.warn( 'ignored' );
			log.error( 'ignored' );
		} );

		it( 'should not send log entries to other adapters', function() {
			expect( mockLog.test ).to.be.undefined;
		} );

		it( 'should log to console', function() {
			spy.callCount.should.equal( 4 );
		} );

		after( function() {
			spy.restore();
			process.env.DEBUG = original;
		} );
	} );

	describe( 'without debug', function() {
		var original = process.env.DEBUG;
		var spy, log;
		before( function() {
			delete process.env.DEBUG;
			log = logFn( {
				adapters: {
					'./spec/mockLogger.js': {
						level: 2
					}
				}
			}, 'test' );
			spy = stubOutput();
			log.debug( 'debug' );
			log.info( 'info' );
			log.warn( 'warn' );
			log.error( 'error' );
		} );

		it( 'should log entries to adapter', function() {
			mockLog.test.entries.should.eql( {
				error: [ 'error' ],
				warn: [ 'warn' ],
				info: [],
				debug: []
			} );
		} );

		it( 'should not log to debug adapter', function() {
			spy.callCount.should.equal( 0 );
		} );

		after( function() {
			process.env.DEBUG = original;
			spy.restore();
		} );
	} );
} );
