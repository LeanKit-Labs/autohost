var gulp = require( 'gulp' );
var bg = require( 'biggulp' )( gulp );

gulp.task( 'coverage', bg.withCoverage() );

gulp.task( 'continuous-test', function() {
	return bg.test();
} );

gulp.task( 'coverage-watch', function() {
	bg.watch( [ 'coverage' ] );
} );

gulp.task( 'show-coverage', bg.showCoverage() );

gulp.task( 'test-watch', function() {
	bg.watch( [ 'continuous-test' ] );
} );

gulp.task( 'test', function() {
	return bg.testOnce();
} );

gulp.task( 'default', [ 'coverage', 'coverage-watch' ], function() {} );
gulp.task( 'ci', [ 'continuous-test', 'test-watch' ], function() {} );
