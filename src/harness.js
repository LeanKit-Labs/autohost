var _ = require('lodash');
var path = require('path');
var port = 8988;
var defaults = {
	port: port,
	socketio: true,
	websocket: true
};

module.exports = function setup(config) {
	config = _.defaults(config, defaults);
	require('./log')(config.log);

	var authProvider;
	var hasAuth = !config.noAuth;
	if (hasAuth) {
		authProvider = require('./mock/auth')(config);
		if (config.defaultUser) {
			authProvider.tokens = { 'one': 'userone' };
			authProvider.users = {
				'userone': { name: 'userone', password: 'pass', roles: ['user'] },
			};
		}
	}

	var autohost = require('./index');
	config.authProvider = authProvider;
	var host = autohost(config);
	var httpAdapter = host.transport.adapters.http;
	var socketAdapter = host.transport.adapters.ws;
	var http = host.http;
	var socket = host.socket;
	var middleware = host.middleware;
	var actionRoles = function (action, roles) {
		if (authProvider) {
			authProvider.actions[action] = { roles: roles };
		}
	};

	var addAction = function (resourceName, actionName, handle, method, url, topic, resourceMiddleware, actionMiddleware) {
		var fqn = [resourceName, actionName].join('.');
		httpAdapter.action(
			{ name: resourceName, middleware: resourceMiddleware },
			actionName,
			{
				method: method || 'get',
				url: url || '/' + actionName,
				middleware: actionMiddleware,
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
		actionRoles(fqn, []);
	};

	var addMiddleware = function (url, mw, alias) {
		http.middleware(url, mw, alias);
	};

	var addResource = function (resource, resourcePath) {
		httpAdapter.resource(resource, resourcePath || './', {});
		socketAdapter.resource(resource);
		_.each(resource.actions, function (action, actionName) {
			actionRoles([resource.name, actionName].join('.'), []);
		});
	};

	var addRoute = function (url, method, handle) {
		http.route(url, method, handle);
	};

	var addPath = function (url, opts) {
		var options = typeof opts === 'string' ? { path: opts } : opts;
		options.path = path.join(__dirname, options.path);
		http.static(url, options);
	};

	var addTopic = function (topic, handle) {
		socket.on(topic, handle);
	};

	var addUser = function (name, password, token, roles) {
		authProvider.users[name] = { name: name, password: password, roles: roles || [] };
		authProvider.tokens[token] = name;
	};

	var clearUsers = function () {
		authProvider.users = {};
		if (httpAdapter.passport) {
			httpAdapter.passport.resetUserCheck();
		}
	};

	var userRoles = function (user, roles) {
		if (authProvider.users[user]) {
			authProvider.users[user].roles = roles;
		} else {
			authProvider.users[user] = { roles: roles };
		}
	};

	var wsClients = [];
	var ioClients = [];
	var io = require('socket.io-client');
	var WebSocketClient = require('websocket').client;

	var getIOClient = function (address, opts) {
		opts = opts || {};
		opts.multiplex = false;
		var ioClient = io(address, opts);
		ioClients.push(ioClient);
		return ioClient;
	};

	var getWSClient = function (address, opts) {
		var wsClient = new WebSocketClient();
		wsClient.connect(address, 'echo-protocol', 'console', opts);
		return wsClient;
	};

	var start = function () {
		host.start();
	};

	var stop = function () {
		if (authProvider) {
			authProvider.tokens = {};
			authProvider.users = {};
			authProvider.actions = {};
		}
		_.each(ioClients, function (i) {
			if (i && i.close) {
				i.close();
			}
		});
		_.each(wsClients, function (w) {
			w.close();
		});

		if (socket.websocket && socket.websocket.socketServer) {
			socket.websocket.socketServer.pendingRequests = [];
		}

		host.stop();
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
		http: host.http,
		httpAdapter: httpAdapter,
		middleware: middleware,
		setActionRoles: actionRoles,
		setUserRoles: userRoles,
		socket: socket,
		socketAdapter: socketAdapter,
		start: start,
		stop: stop
	};
};
