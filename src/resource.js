var _ = require( 'lodash' ),
	path = require( 'path' ),
	when = require('when'),
	fs = require( 'fs' );


module.exports = function( Host ) {

	Host.prototype.getResources = function( filePath, onList ) {
		var self = this;
		var list = [];
		var onDirectory = function( err, contents ) {
			if( !err && contents.length > 0 ) {
				qualified = [];
				_.each( contents, function( item ) {
					var resourcePath = self.buildPath( [ filePath, item, 'resource.js' ] );
					if( fs.existsSync( resourcePath ) ) {
						list.push( resourcePath );
					}
				} );
				onList( list );
			}
		};
		fs.readdir( filePath, onDirectory );
	};

	Host.prototype.loadModule = function( resourcePath ) {
		try {
			delete require.cache[ resourcePath ];
			var mod = require( resourcePath )( this );
			this.processResource( 'api', mod, path.dirname( resourcePath ) );
		} catch (err) {
			console.log( 'Error loading resource module:', err, err.stack );
		}
	};

	Host.prototype.loadResources = function( filePath ) {
		return when.promise(function(resolve, reject, notify) {
			var self = this;
			var resourcePath = path.resolve( __dirname, filePath );
			this.watch( resourcePath );
			var resources = this.getResources( resourcePath, function( list ) {
				_.each( list, self.loadModule );
				resolve();
			} );
							
		}.bind(this));
	};

	Host.prototype.processResource = function( prefix, resource, basePath ) {
		var self = this,
			name = resource.name,
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
				url = action.url || self.buildUrl( prefix, name, ( action.path || '' ) ),
				verb = action.verb,
				actionName = [ name, action.alias ].join( '.' );

			self.handleRoute( url, verb, resource, handle, actionName );
			self.handleTopic( topic, resource, handle, actionName );

			meta.routes[ action.alias ] = { verb: verb, url: url };
			meta.topics[ action.alias ] = { topic: topic };
			actions.push( actionName );
		} );
	};
};