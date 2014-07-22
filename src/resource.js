var _ = require( 'lodash' ),
	path = require( 'path' ),
	when = require('when'),
	nodeWhen = require( 'when/node' ),
	fs = require( 'fs' ),
	readDirectory = nodeWhen.lift( fs.readdir );

module.exports = function( Host ) {

	Host.prototype.getResources = function( filePath, onList ) {
		var list = [];
		if( fs.existsSync( filePath ) ) {
			return readDirectory( filePath )
				.then( function( contents ) {
					return _.map( contents, function( item ) {
						var resourcePath = this.buildPath( [ filePath, item, 'resource.js' ] );
						if( fs.existsSync( resourcePath ) ) {
							return resourcePath;
						}
					}.bind( this ) );
				}.bind( this ) );	
		} else {
			return when( [] );
		}
	};

	Host.prototype.loadModule = function( resourcePath ) {
		try {
			var key = path.resolve( resourcePath );
			delete require.cache[ key ];
			var mod = require( resourcePath )( this );
			if( mod && mod.name ) {
				this.processResource( this.config.apiPrefix, mod, path.dirname( resourcePath ) );
			} else {
				console.log( 'Skipping resource at', resourcePath, 'no valid metadata provided' );
			}
		} catch (err) {
			console.log( 'Error loading resource module at', resourcePath, 'with', err.stack );
		}
	};

	Host.prototype.loadResources = function( filePath ) {
		var resourcePath = path.resolve( __dirname, filePath );
		this.watch( resourcePath );
		return this.getResources( resourcePath )
			.then( function( list ) {
				_.each( _.filter( list ), this.loadModule );
			}.bind( this ) );
	};

	Host.prototype.processResource = function( prefix, resource, basePath ) {
		var name = resource.name,
			meta = this.resources[ name ] = {
				routes: {},
				topics: {}
			},
			actions = this.actions[ name ] = [];

		if( resource.resources && resource.resources != '' ) {
			var directory = this.buildPath( [ basePath, resource.resources ] );
			this.registerPath( '/' + name, directory );
			meta.path = { url: '/' + name, directory: directory };
		}
		_.each( resource.actions, function( action ) {
			var handle = action.handle,
				topic = name + ( ( ( action.topic || '' ) == '' ) ? '' : '.' + action.topic ),
				url = action.url || this.buildUrl( prefix, name, ( action.path || '' ) ),
				verb = action.verb,
				actionName = [ name, action.alias ].join( '.' );

			this.handleRoute( url, verb, resource, handle, actionName );
			this.handleTopic( topic, resource, handle, actionName );

			meta.routes[ action.alias ] = { verb: verb, url: url };
			meta.topics[ action.alias ] = { topic: topic };
			actions.push( actionName );
		}.bind( this ) );
	};
};