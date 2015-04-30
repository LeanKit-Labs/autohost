var _ = require( 'lodash' );
var path = require( 'path' );
var when = require( 'when' );
var nodeWhen = require( 'when/node' );
var fs = require( 'fs' );
var log = require( './log' )( 'autohost.api' );
var readDirectory = nodeWhen.lift( fs.readdir );

function addAdapter( state, protocol, adapter ) {
	state.adapters[ protocol ] = adapter;
}

function attachPath( state, target, filePath ) {
	var dir = path.dirname( filePath );
	if ( _.isArray( target ) ) {
		_.each( target, function( item ) {
			item._path = dir;
		} );
	} else {
		target._path = dir;
	}
}

function clearAdapters( state ) {
	state.adapters = {};
}

// store actions from the resource
function getActions( state, resource ) {
	var list = state.actionList[ resource.name ] = [];
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
function loadAll( state, resourcePath ) {
	var loadActions = [ loadResources( state, resourcePath ) ] || [];
	if ( state.config.modules ) {
		_.each( state.config.modules, function( mod ) {
			var modPath;
			if ( /[\/]/.test( mod ) ) {
				modPath = require.resolve( path.resolve( process.cwd(), mod ) );
			} else {
				modPath = require.resolve( mod );
			}
			loadActions.push( loadModule( state, modPath ) );
		} );
	}
	loadActions.push( loadModule( state, './ahResource' ) );
	return when.all( loadActions );
}


// loads a module based on the file path and resolves the function
// promises and all
function loadModule( state, resourcePath ) {
	try {
		var key = path.resolve( resourcePath );
		delete require.cache[ key ];
		var modFn = require( resourcePath );
		var args = getArguments( modFn );
		args.shift();
		if ( args.length ) {
			return state.fount.resolve( args )
				.then( function( deps ) {
					var argList = _.map( args, function( arg ) {
						return deps[ arg ];
					} );
					argList.unshift( state.host );
					var mod = modFn.apply( modFn, argList );
					attachPath( state, mod, resourcePath );
					return mod;
				} );
		} else {
			var mod = modFn( state.host );
			attachPath( state, mod, resourcePath );
			return when( mod );
		}
	} catch ( err ) {
		console.error( 'Error loading resource module at %s with: %s', resourcePath, err.stack );
		return when( [] );
	}
}

// loadResources from path and returns the modules once they're loaded
function loadResources( state, filePath ) {
	var resourcePath = path.resolve( process.cwd(), filePath );
	return getResources( resourcePath )
		.then( function( list ) {
			return when.all( _.map( _.filter( list ), loadModule.bind( undefined, state ) ) )
				.then( function( lists ) {
					return _.flatten( lists );
				} );
		} );
}

function normalizeResources( state, list ) {
	var flattened = _.flatten( list );
	_.each( flattened, function( resource ) {
		state.resources[ resource.name ] = resource;
		getActions( state, resource );
	} );
	return state.resources;
}

function processModule( state, mod ) {
	if ( mod && mod.name ) {
		return processResource( state, mod, path.dirname( mod._path ) );
	} else {
		log.debug( 'Skipping resource at %s - no valid metadata provided', mod._path );
		return when( [] );
	}
}

function processResource( state, resource ) {
	var meta = _.map( state.adapters, function( adapter ) {
		if ( _.isArray( resource ) ) {
			return _.reduce( resource, function( acc, x ) {
				return deepMerge( x, adapter.resource( x, resource._path, state.resources ) );
			}, {} );
		} else {
			return adapter.resource( resource, resource._path, state.resources );
		}
	} );
	var container = {};
	container[ resource.name ] = _.reduce( meta, reduce, {} );
	return container;
}

function processResources( state ) {
	var resources = _.map( state.resources, processModule.bind( undefined, state ) );
	return _.reduce( resources, reduce );
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

function init( state, resourcePath, auth ) {
	state.actionList = {};
	state.auth = auth;
	return loadAll( state, resourcePath )
		.then( normalizeResources.bind( undefined, state ) )
		.then( function() {
			var meta = processResources( state );
			state.host.actions = state.actionList;
			if ( auth && auth.updateActions ) {
				return auth.updateActions( state.actionList )
					.then( function() {
						return meta || {};
					} );
			}
			return meta || {};
		} );
}

function stop( state ) {
	_.each( state.adapters, function( adapter ) {
		adapter.stop();
	} );
}

function start( state ) {
	_.each( state.adapters, function( adapter ) {
		adapter.start( state.config, state.auth );
	} );
}

function trimString( str ) {
	return str.trim();
}

function trim( list ) {
	return ( list && list.length ) ? _.filter( list.map( trimString ) ) : [];
}

module.exports = function( host, config ) {
	var state = {
		auth: undefined,
		actionList: {},
		adapters: {},
		config: config,
		host: host,
		fount: host.fount,
		resources: {}
	};

	_.merge( state, {
		addAdapter: addAdapter.bind( undefined, state ),
		clearAdapters: clearAdapters.bind( undefined, state ),
		loadModule: loadModule.bind( undefined, state ),
		loadResources: loadResources.bind( undefined, state ),
		init: init.bind( undefined, state ),
		start: start.bind( undefined, state ),
		stop: stop.bind( undefined, state )
	} );
	return state;
};
