require( '../setup' );
var fount = require( 'fount' );

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

describe( 'Transport', function() {
	describe( 'when loading from a bad path', function() {
		var transport;
		var host = { actions: undefined };
		var adapter = getAdapter();

		before( function() {
			transport = require( '../../src/transport.js' )( host, {} );
			transport.addAdapter( 'test', adapter );
		} );

		it( 'should only show the default API endpoint', function() {
			return transport.init( './spec/durp' )
				.should.eventually.deep.equal( {
				ah: { routes: { } }
			} );
		} );

		after( function() {
			transport.clearAdapters();
		} );
	} );

	describe( 'when loading from a good path', function() {
		var transport;
		var err;
		var host = { actions: undefined, fount: fount };
		var adapter = getAdapter();

		before( function() {
			// use dependencies for resource two to set the action aliases
			// this helps prove a fix for the defect that was dropping the host
			// argument from resource function calls with dependencies
			fount.register( 'durp1', 'hello' );
			fount.register( 'durp2', 'goodbye' );
			transport = require( '../../src/transport.js' )( host, { modules: [ './spec/misc/anresource.js' ] } );
			transport.addAdapter( 'test', adapter );
		} );

		it( 'should load all resources and actions', function() {
			return transport.init( './spec/resource' )
				.should.eventually.deep.equal(
				{
					one: {
						routes: {
							a: { method: undefined, url: undefined },
							b: { method: undefined, url: undefined }
						}
					},
					two: {
						routes: {
							hello: { method: undefined, url: undefined },
							goodbye: { method: undefined, url: undefined }
						}
					},
					three: {
						routes: {
							c: { method: undefined, url: undefined },
							d: { method: undefined, url: undefined }
						}
					},
					four: {
						routes: {
							e: { method: undefined, url: undefined },
							f: { method: undefined, url: undefined }
						}
					},
					somethingImportant: {
						routes: {
							self: { method: undefined, url: undefined }
						}
					},
					ah: {
						routes: {	}
					}
				} );
		} );

		it( 'should attach paths to all loaded modules', function() {
			var paths = _.map( transport.resources, function( resource ) {
				return resource._path;
			} );
			paths.should.eql( [
				path.resolve( './', 'spec/resource/one' ),
				path.resolve( './', 'spec/resource/three' ),
				path.resolve( './', 'spec/resource/two' ),
				path.resolve( './', 'spec/misc' ),
				path.resolve( './', 'spec/misc' ),
				'.'
			] );
		} );

		it( 'should produce correctly formatted action list', function() {
			transport.actionList.should.eql(
				{
					one: [ 'one.a', 'one.b' ],
					two: [ 'two.hello', 'two.goodbye' ],
					three: [ 'three.c', 'three.d' ],
					four: [ 'four.e', 'four.f' ],
					somethingImportant: [ 'somethingImportant.self' ],
					ah: [ ]
				} );
		} );

		it( 'should not start adapter', function() {
			adapter.started.should.be.false; // jshint ignore:line
		} );

		after( function() {
			transport.clearAdapters();
			fount.purgeAll();
		} );
	} );
} );
