var should = require( 'should' ); //jshint ignore:line
var fount = require( 'fount' );
var _ = require( 'lodash' );

var getAdapter = function() {
	var fauxdapter = {
		resources: [],
		started: false,
		resource: function( resource ) {
			this.resources.push( resource );
			var meta = { routes: {} };
			_.map( resource.actions, function( action, actionName ) {
				meta.routes[ actionName ] = { method: action.method, url: undefined };
			} );
			return meta;
		},
		start: function() {
			this.started = true;
		}
	};
	_.bindAll( fauxdapter );
	return fauxdapter;
};

describe( 'API', function() {
	describe( 'when loading from a bad path', function() {
		var result,
			api,
			host = { actions: undefined },
			adapter = getAdapter();

		before( function( done ) {
			api = require( '../src/api.js' )( host, {} );
			api.addAdapter( adapter );
			api.start( './spec/durp' )
				.then( null, function( /* err */ ) {
					return [];
				} )
				.then( function( list ) {
					result = list;
					done();
				} );
		} );

		it( 'should only show the default API endpoint', function() {
			should( result ).eql( {
				ah: { routes: { metrics: { method: 'get', url: undefined } } }
			} );
		} );

		after( function() {
			api.clearAdapters();
		} );
	} );

	describe( 'when loading from a good path', function() {
		var result,
			api,
			err,
			host = { actions: undefined, fount: fount },
			adapter = getAdapter();

		before( function( done ) {
			// use dependencies for resource two to set the action aliases
			// this helps prove a fix for the defect that was dropping the host
			// argument from resource function calls with dependencies
			fount.register( 'durp1', 'hello' );
			fount.register( 'durp2', 'goodbye' );
			api = require( '../src/api.js' )( host, { modules: [ '../spec/misc/anresource.js' ] } );
			api.addAdapter( adapter );
			api.start( './spec/resource' )
				.then( null, function( error ) {
					err = error;
					return [];
				} )
				.then( function( list ) {
					result = list;
					done();
				} );
		} );

		it( 'should not result in an error', function() {
			should( err ).not.exist; // jshint ignore:line
		} );

		it( 'should load all resources and actions', function() {
			result.one.routes.should.eql( {
				a: { method: undefined, url: undefined },
				b: { method: undefined, url: undefined }
			} );

			result.two.routes.should.eql( {
				hello: { method: undefined, url: undefined },
				goodbye: { method: undefined, url: undefined }
			} );

			result.three.routes.should.eql( {
				c: { method: undefined, url: undefined },
				d: { method: undefined, url: undefined }
			} );
		} );

		it( 'should produce correctly formatted action list', function() {
			api.actionList.should.eql(
				{
					one: [ 'one.a', 'one.b' ],
					two: [ 'two.hello', 'two.goodbye' ],
					three: [ 'three.c', 'three.d' ],
					four: [ 'four.e', 'four.f' ],
					ah: [ 'ah.metrics' ]
				} );
		} );

		it( 'should start adapter', function() {
			adapter.started.should.be.true; //jshint ignore:line
		} );

		after( function() {
			api.clearAdapters();
			fount.purgeAll();
		} );
	} );
} );
