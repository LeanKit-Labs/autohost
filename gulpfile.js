var gulp = require( 'gulp' ),
	mocha = require( 'gulp-mocha' ),
	processhost = require( 'processhost' )();

gulp.task( 'test', function() {
	
} );

gulp.task( 'watch', function() {
	gulp.watch( [ './src/**', './demo/**' ], [ 'restart' ] );
} );

gulp.task( 'restart', function() {
	console.log( "restarting application" );
	processhost.restart();
});

gulp.task( 'demo', function() {
	processhost.startProcess( "server", {
		command: 'node',
		args: [ './demo/index.js' ],
		stdio: "inherit",
		restart: true
	} );
} );

gulp.task( 'default', [ 'demo', 'watch' ], function() {
} );