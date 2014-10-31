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

	it( 'should still load _autohost resource actions', function() {
		result._autohost.routes.should.eql( {
			api: { method: 'get', url: undefined },
			resources: { method: 'get', url: undefined },
			actions: { method: 'get', url: undefined },
			'change-password': { method: 'patch', url: undefined },
			'connected-sockets': { method: 'get', url: undefined },
			'create-token': { method: 'post', url: undefined },
			'destroy-token': { method: 'delete', url: undefined },
			'list-users': { method: 'get', url: undefined },
			'list-roles': { method: 'get', url: undefined },
			'list-user-roles': { method: 'get', url: undefined },
			'list-action-roles': { method: 'get', url: undefined },
			'list-tokens': { method: 'get', url: undefined },
			'add-action-roles': { method: 'patch', url: undefined },
			'remove-action-roles': { method: 'delete', url: undefined },
			'add-user-roles': { method: 'patch', url: undefined },
			'remove-user-roles': { method: 'delete', url: undefined },
			'add-role': { method: 'post', url: undefined },
			'remove-role': { method: 'delete', url: undefined },
			'create-user': { method: 'post', url: undefined },

			'enable-user': { method: 'put', url: undefined },
			'disable-user': { method: 'delete', url: undefined },
			metrics: { method: 'get', url: undefined } 
		} );
	} );

	it( 'should produce correctly formatted action list', function() {
		api.actionList.should.eql( 
		{ _autohost: [
			'_autohost.api',
			'_autohost.resources',
			'_autohost.actions',
			'_autohost.connected-sockets',
			'_autohost.list-users',
			'_autohost.list-roles',
			'_autohost.list-user-roles',
			'_autohost.list-action-roles',
			'_autohost.add-action-roles',
			'_autohost.remove-action-roles',
			'_autohost.add-user-roles',
			'_autohost.remove-user-roles',
			'_autohost.add-role',
			'_autohost.remove-role',
			'_autohost.create-user',
			'_autohost.change-password',
			'_autohost.create-token',
			'_autohost.destroy-token',
			'_autohost.list-tokens',
			'_autohost.enable-user',
			'_autohost.disable-user',
			'_autohost.metrics'
			]
		} );
	} );

	after( function() {
		api.clearAdapters();
	} );
} );

describe( 'when loading from a good path', function() {
	var result,
		api,
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
			.then( null, function( /* err */ ) {
				return [];
			} )
			.then( function( list ) {
				result = list;
				done();
			} );
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

		result._autohost.routes.should.eql( { 
			api: { method: 'get', url: undefined },
			resources: { method: 'get', url: undefined },
			actions: { method: 'get', url: undefined },
			'change-password': { method: 'patch', url: undefined },
			'connected-sockets': { method: 'get', url: undefined },
			'create-token': { method: 'post', url: undefined },
			'destroy-token': { method: 'delete', url: undefined },
			'list-users': { method: 'get', url: undefined },
			'list-roles': { method: 'get', url: undefined },
			'list-user-roles': { method: 'get', url: undefined },
			'list-action-roles': { method: 'get', url: undefined },
			'list-tokens': { method: 'get', url: undefined },
			'add-action-roles': { method: 'patch', url: undefined },
			'remove-action-roles': { method: 'delete', url: undefined },
			'add-user-roles': { method: 'patch', url: undefined },
			'remove-user-roles': { method: 'delete', url: undefined },
			'add-role': { method: 'post', url: undefined },
			'remove-role': { method: 'delete', url: undefined },
			'create-user': { method: 'post', url: undefined },
			'enable-user': { method: 'put', url: undefined },
			'disable-user': { method: 'delete', url: undefined },
			metrics: { method: 'get', url: undefined } 
		} );
	} );

	it( 'should produce correctly formatted action list', function() {
		api.actionList.should.eql( 
		{ _autohost: [
			'_autohost.api',
			'_autohost.resources',
			'_autohost.actions',
			'_autohost.connected-sockets',
			'_autohost.list-users',
			'_autohost.list-roles',
			'_autohost.list-user-roles',
			'_autohost.list-action-roles',
			'_autohost.add-action-roles',
			'_autohost.remove-action-roles',
			'_autohost.add-user-roles',
			'_autohost.remove-user-roles',
			'_autohost.add-role',
			'_autohost.remove-role',
			'_autohost.create-user',
			'_autohost.change-password',
			'_autohost.create-token',
			'_autohost.destroy-token',
			'_autohost.list-tokens',
			'_autohost.enable-user',
			'_autohost.disable-user',
			'_autohost.metrics'
			],
			one: [ 'one.a', 'one.b' ],
			two: [ 'two.hello', 'two.goodbye' ],
			three: [ 'three.c', 'three.d' ]
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