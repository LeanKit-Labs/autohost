var istanbul = require( 'gulp-istanbul' );
var gulp = require( 'gulp' );
var mocha = require( 'gulp-mocha' );
var open = require( 'open' ); //jshint ignore : line

function cover( done ) {
	gulp.src( [ './src/**/*.js' ] )
		.pipe( istanbul() )
		.pipe( istanbul.hookRequire() )
		.on( 'finish', function() {
			done( runSpecs() );
		} );
}

function runSpecs() { // jshint ignore : line
	return gulp.src( [ './spec/*.spec.js' ], { read: false } )
				.pipe( mocha( { reporter: 'spec' } ) );
}

function writeReport( cb, openBrowser, tests ) {
	tests
		.on( 'error', function() {
			cb();
		} )
		.pipe( istanbul.writeReports() )
		.on( 'end', function() {
			if( openBrowser ) {
				open( './coverage/lcov-report/index.html' );
			}
			cb();
		} );
}

gulp.task( 'continuous-coverage', function( cb ) {
	cover( writeReport.bind( undefined, cb, false ) );
} );

gulp.task( 'continuous-test', function() {
	return runSpecs();
} );

gulp.task( 'coverage', function( cb ) {
	cover( writeReport.bind( undefined, cb, true ) );
} );

gulp.task( 'coverage-watch', function() {
	gulp.watch( [ './src/**/*', './spec/*.spec.js' ], [ 'continuous-coverage' ] );
} );

gulp.task( 'test', function() {
	return runSpecs()
		.on( 'end', process.exit.bind( process, 0 ) )
		.on( 'error', process.exit.bind( process, 1 ) );
} );

gulp.task( 'test-watch', function() {
	gulp.watch( [ './src/**/*', './spec/*.spec.js' ], [ 'continuous-test' ] );
} );

gulp.task( 'default', [ 'continuous-coverage', 'coverage-watch' ], function() {
} );

gulp.task( 'specs', [ 'continuous-test', 'test-watch' ], function() {
} );