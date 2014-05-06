var fs = require( 'fs' ),
	path = require( 'path' ),
	laters = require( 'laters' ),
	_ = require( 'lodash' ),
	semver = require( 'semver' ),
	mkdirp = require( 'mkdirp' ),
	rootApp = path.resolve( './demo/public/app' );

module.exports = function() {
	return {
		name: 'app',
		resources: 'public',
		actions: [
			{
				alias: 'list',
				verb: 'get',
				topic: 'list',
				path: '',
				handle: function( envelope ) {
					var cwd = process.cwd(),
						top = './demo/public/app',
						dir = path.resolve( cwd, top );
					fs.readdir( dir, function( err, subdirs ) {
						if( !err ) {
							var tasks = {};
							_.each( subdirs, function( subdir ) { 
								var full = path.resolve( dir, subdir );
								tasks[ subdir ] = function( done ) {
									fs.readdir( full, function( err, files ) {
										if( !err ) {
											files = _.filter( files, function( f ) { return !/DS_Store$/.test( f ); } );
											done( _.map( files, function( f ) {
												var match = /([.][0-9]){3}[-]?[0-9]*/.exec(f),
													// version = ( match ? match[ 0 ] : '' ).substring(1, 6),
													pattern = ( match ? match[ 0 ] : '' ),
													version = pattern.substring( 1, pattern.length ),
													relative = path.resolve( '/app', subdir ),
													filePath = path.resolve( relative, f );
												console.log( pattern );
												return { version: version, path: filePath };
											} ) )
										} else {
											done([err]);
										}
									} );
								};
							} );
							tasks = _.omit( tasks, '.DS_Store' );
							laters.mapped( tasks, function( result ) {
								_.each( result, function( list ) {
									list.sort( function( a, b ) {
										return semver.rcompare( a.version, b.version );
									} );
								} );
								envelope.reply( { data: result } );
							} );
						} else {
							envelope.reply( 500, ":(" );
						}
					} );
				}
			},
			{
				alias: 'upload',
				verb: 'post',
				path: '/:platform/:file',
				handle: function( envelope ) {
					console.log( envelope.files );
					if( envelope.files && envelope.files ) {
						var uploaded = _.keys( envelope.files )[ 0 ],
							file = envelope.files[ uploaded ],
							fileName = file.originalFilename,
							tmp = file.path,
							ext = path.extname( fileName ),
							destination = path.join( rootApp, envelope.data.platform, fileName );
						mkdirp( path.join( rootApp, envelope.data.platform ) );
						
						if( ext == '.gz' ) {
							fs.rename( tmp, destination, function( err ) {
								fs.unlink( tmp, function() {} );
								if( err ) {
									envelope.reply( { statusCode: 500, data: err } );
								} else {
									envelope.reply( { data: "Upload completed successfully" } );
								}
							} );
						} else {
							envelope.reply( { statusCode: 400, data: "Will not accept invalid package" } );
						}
					} else {
						envelope.reply( { statusCode: 400, data: "No file present in request" } );
					}
				}
			}
		]
	};
};