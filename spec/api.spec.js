var should = require( 'should' ),
	fount = require( 'fount' ),
	_ = require( 'lodash' );

var getAdapter = function() {
	var fauxdapter = {
		resources: [],
		started: false,
		resource: function( resource ) {
			this.resources.push( resource );
			var meta = { routes: {} };
			_.map( resource.actions, function( action ) {
				meta.routes[ action.alias ] = { verb: action.verb, url: action.url };
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
		api = require( '../src/api.js' )( host, fount );
		api.addAdapter( adapter );
		api.start( './spec/durp' )
			.then( null, function( err ) {
				return [];
			} )
			.then( function( list ) {
				result = list;
				done();
			} );
	} );

	it( 'should still load _autohost resource actions', function() {
		result._autohost.routes.should.eql( { 
			api: { verb: 'get', url: undefined },
			resources: { verb: 'get', url: undefined },
			actions: { verb: 'get', url: undefined },
			'connected-sockets': { verb: 'get', url: undefined },
			'list-users': { verb: 'get', url: undefined },
			'list-roles': { verb: 'get', url: undefined },
			'list-user-roles': { verb: 'get', url: undefined },
			'list-action-roles': { verb: 'get', url: undefined },
			'set-action-roles': { verb: 'put', url: undefined },
			'add-action-roles': { verb: 'patch', url: undefined },
			'remove-action-roles': { verb: 'delete', url: undefined },
			'set-user-roles': { verb: 'put', url: undefined },
			'add-user-roles': { verb: 'patch', url: undefined },
			'remove-user-roles': { verb: 'delete', url: undefined },
			'add-role': { verb: 'post', url: undefined },
			'remove-role': { verb: 'delete', url: undefined },
			'create-user': { verb: 'post', url: undefined },
			'enable-user': { verb: 'put', url: undefined },
			'disable-user': { verb: 'delete', url: undefined },
			metrics: { verb: 'get', url: undefined } 
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
			'_autohost.set-action-roles',
			'_autohost.add-action-roles',
			'_autohost.remove-action-roles',
			'_autohost.set-user-roles',
			'_autohost.add-user-roles',
			'_autohost.remove-user-roles',
			'_autohost.add-role',
			'_autohost.remove-role',
			'_autohost.create-user',
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
		host = { actions: undefined },
		adapter = getAdapter();

	before( function( done ) {
		api = require( '../src/api.js' )( host, fount );
		api.addAdapter( adapter );
		api.start( './spec/resources' )
			.then( null, function( err ) {
				return [];
			} )
			.then( function( list ) {
				result = list;
				done();
			} );
	} );

	it( 'should load all resources and actions', function() {
		result.one.routes.should.eql( {
			a: { verb: undefined, url: undefined },
			b: { verb: undefined, url: undefined }
		} );

		result.two.routes.should.eql( {
			a: { verb: undefined, url: undefined },
			b: { verb: undefined, url: undefined }
		} );

		result._autohost.routes.should.eql( { 
			api: { verb: 'get', url: undefined },
			resources: { verb: 'get', url: undefined },
			actions: { verb: 'get', url: undefined },
			'connected-sockets': { verb: 'get', url: undefined },
			'list-users': { verb: 'get', url: undefined },
			'list-roles': { verb: 'get', url: undefined },
			'list-user-roles': { verb: 'get', url: undefined },
			'list-action-roles': { verb: 'get', url: undefined },
			'set-action-roles': { verb: 'put', url: undefined },
			'add-action-roles': { verb: 'patch', url: undefined },
			'remove-action-roles': { verb: 'delete', url: undefined },
			'set-user-roles': { verb: 'put', url: undefined },
			'add-user-roles': { verb: 'patch', url: undefined },
			'remove-user-roles': { verb: 'delete', url: undefined },
			'add-role': { verb: 'post', url: undefined },
			'remove-role': { verb: 'delete', url: undefined },
			'create-user': { verb: 'post', url: undefined },
			'enable-user': { verb: 'put', url: undefined },
			'disable-user': { verb: 'delete', url: undefined },
			metrics: { verb: 'get', url: undefined } 
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
			'_autohost.set-action-roles',
			'_autohost.add-action-roles',
			'_autohost.remove-action-roles',
			'_autohost.set-user-roles',
			'_autohost.add-user-roles',
			'_autohost.remove-user-roles',
			'_autohost.add-role',
			'_autohost.remove-role',
			'_autohost.create-user',
			'_autohost.enable-user',
			'_autohost.disable-user',
			'_autohost.metrics'
			],
			one: [ 'one.a', 'one.b' ],
			two: [ 'two.a', 'two.b' ] 
		} );
	} );

	it( 'should start adapter', function() {
		adapter.started.should.be.true;
	} );

	after( function() {
		api.clearAdapters();
	} );
} );