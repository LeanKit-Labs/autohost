var _ = require( 'lodash' ),
	path = require( 'path' ),
	when = require('when'),
	nodeWhen = require( 'when/node' ),
	fs = require( 'fs' ),
	gaze = require( 'gaze' ),
	debug = require( 'debug' )( 'autohost:api' ),
	readDirectory = nodeWhen.lift( fs.readdir ),
	wrapper = {
		actionList: {},
		addAdapter: addAdapter,
		clearAdapters: clearAdapters,
		loadResources: loadResources,
		start: start
	},
	adapters = [],
	host,
	fount;

function addAdapter( adapter ) {
	adapters.push( adapter );
}

function clearAdapters() {
	adapters = [];
}

function getResources( filePath ) {
	var list = [];
	if( fs.existsSync( filePath ) ) {
		return readDirectory( filePath )
			.then( function( contents ) {
				return _.map( contents, function( item ) {
					var resourcePath = path.join( filePath, item, 'resource.js' );
					if( fs.existsSync( resourcePath ) ) {
						return resourcePath;
					}
				}.bind( this ) );
			}.bind( this ) );	
	} else {
		return when( [] );
	}
}

function getActions( resource ) {
	var list = wrapper.actionList[ resource.name ] = [];
	_.each( resource.actions, function( action ) {
		list.push( [ resource.name, action.alias ].join( '.' ) );
	} );
}

function loadModule( resourcePath ) {
	try {
		var key = path.resolve( resourcePath );
		delete require.cache[ key ];
		var mod = require( resourcePath )( host );
		if( mod && mod.name ) {
			return processResource( mod, path.dirname( resourcePath ) );
		} else {
			debug( 'Skipping resource at %s - no valid metadata provided', resourcePath );
			return when( [] );
		}
	} catch (err) {
		debug( 'Error loading resource module at %s with: %s', resourcePath, err.stack );
		return when( [] );
	}
}

function loadResources( filePath ) {
	var resourcePath = path.resolve( process.cwd(), filePath );
	watch( resourcePath );
	return getResources( resourcePath )
		.then( function( list ) {
			return when.all( _.map( _.filter( list ), loadModule ) )
				.then( function( lists ) {
					return _.flatten( lists );
				} );
		} );
}

function loadSelf() {
	loadModule( path.resolve( __dirname, './_autohost/resource.js' ) )
}

function processResource( resource, basePath ) {
	getActions( resource );
	return when.all( _.map( adapters, function( adapter ) {
		return when.try( adapter.resource, resource, basePath )
	} ) )
	.then( function( meta ) {
		var container = {};
		container[ resource.name ] = _.reduce( meta, reduce, {} );
		return container;
	} );
}

function reduce( acc, resource ) {
	_.each( resource, function( val, key ) {
		if( acc[ key ] ) {
			_.each( val, function( list, prop ) {
				acc[ key ][ prop ] = list;
			} );
		} else {
			acc[ key ] = val;
		}
	} );
	return acc;
}

function start( resourcePath, auth ) {
	wrapper.actionList = {};
	return when.all( [
			loadResources( resourcePath ),
			processResource( require( './_autohost/resource.js' )( host, fount ), path.resolve( __dirname, './_autohost' ) )
		] )
		.then( function ( list ) {
			host.actions = wrapper.actionList;
			if( auth ) {
				auth.authorizer.actionList( wrapper.actionList )
					.then( function() {
						startAdapters();
					} );
			} else {
				startAdapters();
			}
			var flattened = _.reduce( _.flatten( list ), reduce, {} );
			return flattened;
		} );
}

function startAdapters() {
	_.each( adapters, function( adapter ) {
		adapter.start();
	} );
}

function watch( filePath ) {
	if( !fs.existsSync( filePath ) )
		return;
	return gaze( path.join( filePath, '**/resource.js' ), function( err, watcher ) {
		this.on( 'changed', function( changed ) {
			debug( 'Reloading changed resource from %s', path.basename( path.dirname( changed ) ) );
			loadModule( changed );
		} );
	} );
}

module.exports = function( ah ) {
	host = ah;
	return wrapper;
};