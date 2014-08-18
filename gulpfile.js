var gulp = require( 'gulp' ),
	mocha = require( 'gulp-mocha' ),
	processHost = require( 'processHost' )(),
	mochaPhantom = require( 'gulp-mocha-phantomjs' );

gulp.task( 'test', function() {
	return gulp.src( [ './spec/websocket/*.spec.js', './spec/socketio/*.spec.js', './spec/*.spec.js' ], { read: false } )
		.pipe( mocha( { reporter: 'spec' } ) )
		.on( 'end', process.exit.bind( process, 0 ) )
		.on( 'error', process.exit.bind( process, 1 ) );
} );

gulp.task( 'continuous-test', function() {
	return gulp.src( [ './spec/websocket/*.spec.js', './spec/socketio/*.spec.js', './spec/*.spec.js' ], { read: false } )
		.pipe( mocha( { reporter: 'spec' } ) );
} );

gulp.task( 'continuous-client', function() {
	if( !processHost.http ) {
		processHost.startProcess( 'http', {
			command: 'node',
			args: [ './spec/dashboard/host.js' ]
		} );
	}

	var stream = mochaPhantom();
	setTimeout( function() {
		stream.write( { path: 'http://localhost:4488/spec/dash.html' } );
		stream.end();
	}, 200 );
	return stream;
} );

gulp.task( 'watch', function() {
	gulp.watch( [ './src/**', './spec/**' ], [ 'continuous-test' ] );
} );

gulp.task( 'watch-client', function() {
	gulp.watch( [ './src/**', './spec/**' ], [ 'continuous-client' ] );
} );

gulp.task( 'client', [ 'continuous-client', 'watch-client' ], function() {

} );

gulp.task( 'default', [ 'continuous-test', 'watch' ], function() {
} );