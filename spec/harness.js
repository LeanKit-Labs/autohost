var _ = require( 'lodash' );
var path = require( 'path' );
var port = 88988;
var defaults = {
	port: port,
	socketio: true,
	websocket: true
};

module.exports = function setup( config ) {
	config = _.defaults( config, defaults );
	var requestor = require( 'request' ).defaults( { jar: false } );
	var metrics = require( 'cluster-metrics' );

	var authProvider;
	var hasAuth = !config.noAuth;
	if ( hasAuth ) {
		authProvider = require( './auth/mock.js' )( config );
		if ( config.defaultUser ) {
			authProvider.tokens = { 'one': 'userone' };
			authProvider.users = {
				'userone': { name: 'userone', password: 'pass', roles: [ 'user' ] },
			};
		}
	}

	var middleware = require( '../src/http/middleware.js' )( metrics );
	middleware.configure( config );
	var http = require( '../src/http/http.js' )( requestor, middleware, metrics, true );
	var httpAdapter = require( '../src/http/adapter.js' )( config, authProvider, http, requestor, metrics );
	var socket = require( '../src/websocket/socket.js' )( config, http, metrics, true );
	var socketAdapter = require( '../src/websocket/adapter.js' )( config, authProvider, socket, metrics );

	var actionRoles = function( action, roles ) {
		if ( authProvider ) {
			authProvider.actions[ action ] = { roles: roles };
		}
	};

	var addAction = function( resourceName, actionName, handle, method, url, topic ) {
		var fqn = [ resourceName, actionName ].join( '.' );
		httpAdapter.action(
			{ name: resourceName },
			actionName,
			{
				method: method || 'get',
				url: url || '/' + actionName,
				handle: handle
			},
			{ routes: {} }
		);

		socketAdapter.action(
			{ name: resourceName },
			actionName,
			{
				method: method || 'get',
				topic: topic || fqn,
				handle: handle
			},
			{ topics: {} }
		);
		actionRoles( fqn, [] );
	};

	var addMiddleware = function( url, mw ) {
		http.middleware( url, mw );
	};

	var addResource = function( resource, resourcePath ) {
		httpAdapter.resource( resource, resourcePath || './', {} );
		socketAdapter.resource( resource );
		_.each( resource.actions, function( action, actionName ) {
			actionRoles( [ resource.name, actionName ].join( '.' ), [] );
		} );
	};

	var addRoute = function( url, method, handle ) {
		http.route( url, method, handle );
	};

	var addPath = function( url, filePath ) {
		http.static( url, path.join( __dirname, filePath ) );
	};

	var addTopic = function( topic, handle ) {
		socket.on( topic, handle );
	};

	var addUser = function( name, password, token, roles ) {
		authProvider.users[ name ] = { name: name, password: password, roles: roles || [] };
		authProvider.tokens[ token ] = name;
	};

	var clearUsers = function() {
		authProvider.users = {};
		if ( httpAdapter.passport ) {
			httpAdapter.passport.resetUserCheck();
		}
	};

	var userRoles = function( user, roles ) {
		if ( authProvider.users[ user ] ) {
			authProvider.users[ user ].roles = roles;
		} else {
			authProvider.users[ user ] = { roles: roles };
		}
	};

	var wsClients = [];
	var ioClients = [];
	var io = require( 'socket.io-client' );
	var WebSocketClient = require( 'websocket' ).client;

	var getIOClient = function( address, opts ) {
		opts = opts || {};
		opts.multiplex = false;
		var ioClient = io( address, opts );
		ioClients.push( ioClient );
		return ioClient;
	};

	var getWSClient = function( address, opts ) {
		var wsClient = new WebSocketClient();
		wsClient.connect( address, 'echo-protocol', 'console', opts );
		return wsClient;
	};

	var start = function() {
		httpAdapter.start();
		socketAdapter.start();
	};

	var stop = function() {
		if ( authProvider ) {
			authProvider.tokens = {};
			authProvider.users = {};
			authProvider.actions = {};
		}
		_.each( ioClients, function( i ) {
			if ( i && i.close ) {
				i.close();
			}
		} );
		_.each( wsClients, function( w ) {
			w.close();
		} );
		httpAdapter.stop();
		socketAdapter.stop();
	};

	return {
		addAction: addAction,
		addMiddleware: addMiddleware,
		addPath: addPath,
		addResource: addResource,
		addRoute: addRoute,
		addTopic: addTopic,
		addUser: addUser,
		auth: authProvider,
		clearUsers: clearUsers,
		getIOClient: getIOClient,
		getWSClient: getWSClient,
		http: http,
		httpAdapter: httpAdapter,
		metrics: metrics,
		middleware: middleware,
		setActionRoles: actionRoles,
		setUserRoles: userRoles,
		socket: socket,
		socketAdapter: socketAdapter,
		start: start,
		stop: stop
	};
};
