// TODO: this module needs a lot of clean up :(
var _ = require( 'lodash' );
var path = require( 'path' );
var when = require( 'when' );
var nodeWhen = require( 'when/node' );
var fs = require( 'fs' );
var log = require( './log' )( 'autohost.api' );
var readDirectory = nodeWhen.lift( fs.readdir );
var resources = {};
var wrapper = {
	actionList: {},
	addAdapter: addAdapter,
	clearAdapters: clearAdapters,
	loadModule: loadModule,
	loadResources: loadResources,
	resources: resources,
	start: start,
	startAdapters: startAdapters,
	stop: stop,
};
var config;
var adapters = [];
var host;
var fount;

function addAdapter( adapter ) {
	adapters.push( adapter );
}

function attachPath( target, filePath ) {
	var dir = path.dirname( filePath );
	if ( _.isArray( target ) ) {
		_.each( target, function( item ) {
			item._path = dir;
		} );
	} else {
		target._path = dir;
	}
}

function clearAdapters() {
	adapters = [];
}

// store actions from the resource
function getActions( resource ) {
	var list = wrapper.actionList[ resource.name ] = [];
	_.each( resource.actions, function( action, actionName ) {
		list.push( [ resource.name, actionName ].join( '.' ) );
	} );
}

function deepMerge( target, source ) {
	_.each( source, function( val, key ) {
		var original = target[ key ];
		if ( _.isObject( val ) ) {
			if ( original ) {
				deepMerge( original, val );
			} else {
				target[ key ] = val;
			}
		} else {
			target[ key ] = ( original === undefined ) ? val : original;
		}
	} );
}

// reads argument names from a function
function getArguments( fn ) {
	return _.isFunction( fn ) ? trim( /[(]([^)]*)[)]/.exec( fn.toString() )[ 1 ].split( ',' ) ) : [];
}

// returns a list of resource files from a given parent directory
function getResources( filePath ) {
	if ( fs.existsSync( filePath ) ) {
		return readDirectory( filePath )
			.then( function( contents ) {
				return _.map( contents, function( item ) {
					var resourcePath = path.join( filePath, item, 'resource.js' );
					if ( fs.existsSync( resourcePath ) ) {
						return resourcePath;
					}
				}.bind( this ) );
			}.bind( this ) );
	} else {
		return when( [] );
	}
}

// loads internal resources, resources from config path and node module resources
function loadAll( resourcePath ) {
	var loadActions = [ loadResources( resourcePath ) ] || [];
	if ( config.modules ) {
		_.each( config.modules, function( mod ) {
			var modPath = require.resolve( mod );
			loadActions.push( loadModule( modPath ) );
		} );
	}
	loadActions.push( loadModule( './ahResource' ) );
	return when.all( loadActions );
}


// loads a module based on the file path and resolves the function
// promises and all
function loadModule( resourcePath ) {
	try {
		var key = path.resolve( resourcePath );
		delete require.cache[ key ];
		var modFn = require( resourcePath );
		var args = getArguments( modFn );
		args.shift();
		if ( args.length ) {
			return fount.resolve( args )
				.then( function( deps ) {
					var argList = _.map( args, function( arg ) {
						return deps[ arg ];
					} );
					argList.unshift( host );
					var mod = modFn.apply( modFn, argList );
					attachPath( mod, resourcePath );
					return mod;
				} );
		} else {
			var mod = modFn( host );
			attachPath( mod, resourcePath );
			return when( mod );
		}
	} catch ( err ) {
		console.error( 'Error loading resource module at %s with: %s', resourcePath, err.stack );
		return when( [] );
	}
}

// loadResources from path and returns the modules once they're loaded
function loadResources( filePath ) {
	var resourcePath = path.resolve( process.cwd(), filePath );
	return getResources( resourcePath )
		.then( function( list ) {
			return when.all( _.map( _.filter( list ), loadModule ) )
				.then( function( lists ) {
					return _.flatten( lists );
				} );
		} );
}

function normalizeResources( list ) {
	var flattened = _.flatten( list );
	_.each( flattened, function( resource ) {
		resources[ resource.name ] = resource;
		getActions( resource );
	} );
	return resources;
}

function processModule( mod ) {
	if ( mod && mod.name ) {
		return processResource( mod, path.dirname( mod._path ) );
	} else {
		log.debug( 'Skipping resource at %s - no valid metadata provided', mod._path );
		return when( [] );
	}
}

function processResource( resource ) {
	var meta = _.map( adapters, function( adapter ) {
		if ( _.isArray( resource ) ) {
			return _.reduce( resource, function( acc, x ) {
				return deepMerge( x, adapter.resource( x, resource._path, resources ) );
			}, {} );
		} else {
			return adapter.resource( resource, resource._path, resources );
		}
	} );
	var container = {};
	container[ resource.name ] = _.reduce( meta, reduce, {} );
	return container;
}

function processResources() {
	return _.reduce( _.map( resources, processModule ), reduce );
}

function reduce( acc, resource ) {
	_.each( resource, function( val, key ) {
		if ( acc[ key ] ) {
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
	return loadAll( resourcePath )
		.then( normalizeResources )
		.then( function() {
			var meta = processResources();
			host.actions = wrapper.actionList;
			if ( auth ) {
				auth.updateActions( wrapper.actionList )
					.then( function() {
						startAdapters( auth );
					} );
			} else {
				startAdapters( auth );
			}
			return meta || {};
		} );
}

function stop() {
	_.each( adapters, function( adapter ) {
		adapter.stop();
	} );
}

function startAdapters( auth ) {
	_.each( adapters, function( adapter ) {
		adapter.start( config, auth );
	} );
}

function trimString( str ) {
	return str.trim();
}

function trim( list ) {
	return ( list && list.length ) ? _.filter( list.map( trimString ) ) : [];
}

module.exports = function( ah, cfg ) {
	config = cfg;
	host = ah;
	fount = ah.fount;
	return wrapper;
};
