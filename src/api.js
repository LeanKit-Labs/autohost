var _ = require( 'lodash' );
var path = require( 'path' );
var when = require('when');
var nodeWhen = require( 'when/node' );
var fs = require( 'fs' );
var debug = require( 'debug' )( 'autohost:api' );
var readDirectory = nodeWhen.lift( fs.readdir );
var wrapper = {
	actionList: {},
	addAdapter: addAdapter,
	clearAdapters: clearAdapters,
	loadModule: loadModule,
	loadResources: loadResources,
	start: start,
	startAdapters: startAdapters,
	stop: stop,
};
var config;
var adapters = [];
var host;
var fount;

function addAdapter( adapter ) { //jshint ignore:line
	adapters.push( adapter );
}

function clearAdapters() { //jshint ignore:line
	adapters = [];
}

function getArguments( fn ) {
	return _.isFunction( fn ) ? trim( /[(]([^)]*)[)]/.exec( fn.toString() )[ 1 ].split( ',' ) ) : [];
}

function getResources( filePath ) {
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
		var modFn = require( resourcePath );
		var args = getArguments( modFn );
		args.shift();
		if( args.length ) {
			var modPromise = fount.resolve( args )
				.then( function( deps ) {
					var argList = _.map( args, function( arg ) {
						return deps[ arg ];
					} );
					return modFn.apply( modFn, argList );
				} );
			return when.try( processModule, modPromise, resourcePath )
				.then( null, function( err ) { console.log( err.stack ); } );
		} else {
			var mod = modFn( host );
			return processModule( mod, resourcePath );
		}
	} catch ( err ) {
		debug( 'Error loading resource module at %s with: %s', resourcePath, err.stack );
		return when( [] );
	}
}

function loadResources( filePath ) { //jshint ignore:line
	var resourcePath = path.resolve( process.cwd(), filePath );
	return getResources( resourcePath )
		.then( function( list ) {
			return when.all( _.map( _.filter( list ), loadModule ) )
				.then( function( lists ) {
					return _.flatten( lists );
				} );
		} );
}

function processModule( mod, resourcePath ) {
	if( mod && mod.name ) {
		return processResource( mod, path.dirname( resourcePath ) );
	} else {
		debug( 'Skipping resource at %s - no valid metadata provided', resourcePath );
		return when( [] );
	}
}

function processResource( resource, basePath ) { //jshint ignore:line
	getActions( resource );
	return when.all( _.map( adapters, function( adapter ) {
		return when.try( adapter.resource, resource, basePath );
	} ) )
	.then( null, function( e ) {
		console.log( e.stack );
	} )
	.then( function( meta ) {
		var container = {};
		container[ resource.name ] = _.reduce( meta, reduce, {} );
		return container;
	} );
}

function reduce( acc, resource ) { //jshint ignore:line
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

function start( resourcePath, auth ) { //jshint ignore:line
	wrapper.actionList = {};
	var loadActions = [
		loadResources( resourcePath ),
		processResource( require( './_autohost/resource.js' )( host, fount ), path.resolve( __dirname, './_autohost' ) )
	];
	if( config.modules ) {
		_.each( config.modules, function( mod ) {
			var modPath = require.resolve( mod );
			loadActions.push( loadModule( modPath ) );	
		} );
	}
	return when.all( loadActions )
		.then( function ( list ) {
			host.actions = wrapper.actionList;
			if( auth ) {
				auth.updateActions( wrapper.actionList )
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

function stop() {
	_.each( adapters, function( adapter ) {
		adapter.stop();
	} );
}

function startAdapters() { //jshint ignore:line
	_.each( adapters, function( adapter ) {
		adapter.start();
	} );
}

function trimString( str ) { return str.trim(); }

function trim( list ) { 
	return ( list && list.length ) ? _.filter( list.map( trimString ) ) : []; 
}

module.exports = function( ah, cfg ) {
	console.log( cfg );
	config = cfg;
	host = ah;
	fount = ah.fount;
	return wrapper;
};