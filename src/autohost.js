// Forked from Anvil's http host and other modules
// Copyright Alex Robson 2011
// MIT License - http://opensource.org/licenses/MIT

var http = require( 'http' ),
	ServerResponse = require( 'http' ).ServerResponse,
	express = require( 'express' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	url = require( 'url' ),
	net = require ( 'net' ),
	_ = require( 'lodash' ),
	mkdirp = require( 'mkdirp' ),
	Monologue = require( 'monologue.js' )( _ ),
	watchTree = require( 'fs-watch-tree' ).watchTree,
	SocketStream = require( './socketStream' ),
	metrics = require( 'cluster-metrics' );

module.exports = function( config ) {
	var PREFIX = 'autohost';

	var Host = function() {
		this.clients = [];
		this.clients.lookup = {};
		this.compilers = {};
		this.middleware = [];
		this.config = config || {};
		this.topics = {};
		this.resources = {};
		this.actions = {};
		this.metrics = metrics;
		this.appName = this.config.appName || 'autohost';
		_.bindAll( this );
	};

	Host.prototype.addCompiler = function( extension, callback ) {
		this.compilers[ extension ] = callback;
		if( this.app ) {
			this.app.engine( extension, callback );
		}
	};

	Host.prototype.addMiddleware = function( filter, middleware ) {
		this.middleware.push( { filter: filter, handler: middleware } );
		if( this.app ) {
			this.app.use( filter, middleware );
		}
	};

	Host.prototype.buildPath = function( pathSpec ) {
		var hasLocalPrefix;
		pathSpec = pathSpec || '';
		if( _.isArray( pathSpec ) ) {
			hasLocalPrefix = pathSpec[0].match( /^[.]\// );
			pathSpec = path.join.apply( {}, pathSpec );
		}
		pathSpec = pathSpec.replace( /^~/, process.env.HOME );
		return hasLocalPrefix ? './' + pathSpec : pathSpec;
	};

	// yay, Jim Cowart to the rescue with this bit
	Host.prototype.buildUrl = function() {
		var idx = 0,
			cleaned = [];
		while( idx < arguments.length ) {
			var segment = arguments[ idx ];
			if( segment.substr( 0, 1 ) === '/' ) {
				segment = segment.substr( 1 );
			}
			if( segment.substr( segment.length-1, 1 ) === '/' ) {
				segment = segment.substring( 0, segment.length - 1 );
			}
			if( !_.isEmpty( segment ) ) {
				cleaned.push( segment );
			}
			idx++;
		}
		return '/' + cleaned.join( '/' );
	};

	Host.prototype.handleRoute = function( url, verb, resource, handle, action ) {
		this.registerRoute( url, verb, function( req, res ) {
			var respond = function() {
				var envelope = {
					data: req.body,
					path: req.url,
					headers: req.headers,
					params: {},
					files: req.files,
					user: req.user,
					responseStream: res,
					reply: function( envelope ) {
						var code = envelope.statusCode || 200;
						res.send( code, envelope.data );
					},
					replyWithFile: function(envelope, contentType, sendFileName, sendStream) {
						res.set({
							"Content-Disposition": 'attachment; filename="'+sendFileName+'"',
							"Content-Type": contentType
						});
						sendStream.pipe(res);
					}
				};
				for( var key in req.params ) {
					var val = req.params[ key ];
					if( !envelope.data[ key ] ) {
						envelope.data[ key ] = val;
					}
					envelope.params[ key ] = val;
				}
				for( var key in req.query ) {
					var val = req.query[ key ];
					if( !envelope.data[ key ] ) {
						envelope.data[ key ] = val;
					}
					envelope.params[ key ] = val;
				}
				handle.apply( resource, [ envelope ] );
			};

			if( this.authorizer ) {
				this.authorizer.getRolesFor( action, function( err, roles ) {
					roles = err ? [] : roles;

					if( roles.length > 0 && _.intersection( roles, req.user.roles ) == 0 ) {
						res.send( 403, "User lacks sufficient permissions" );
					} else {
						respond();
					}
				} );
			} else {
				respond();
			}
		}.bind( this ) );
	};

	Host.prototype.handleTopic = function( topic, resource, handle, action ) {
		this.registerTopic( topic, function( message, socket ) {
			var respond = function() {
				var envelope = {
					data: message.data || message,
					headers: message.headers || [],
					socket: socket,
					user: socket.user,
					path: message.topic,
					reply: function( envelope ) {
						socket.publish( message.replyTo, envelope );
					},
					responseStream: new SocketStream( message.replyTo, socket )
				};
				handle.apply( resource, [ envelope ] );
			};
		
			if( this.authorizer ) {
				this.authorizer.getRolesFor( action, function( err, roles ) {
					roles = err ? [] : roles;
					if( roles.length > 0 && _.intersection( roles, socket.user.roles ) == 0 ) {
						socket.publish( 'NoPe', 'User lacks sufficient permissions' );
					} else {
						respond();
					}
				} );	
			} else {
				respond();
			}
		}.bind( this ) );
	};

	Host.prototype.init = function( config, done ) {
		if( config ) {
			this.config = _.merge( this.config, config );
		}
		var self = this,
			cwd = process.cwd(),
			tmp = path.resolve( cwd, ( this.config.temp || './tmp' ) ),
			public = path.resolve( cwd, ( this.config.static || './public' ) ),
			resources = path.resolve( cwd, ( this.config.resources || './resource' ) );

		mkdirp( tmp );

		this.app = express();
		this.app.use( '/', function( req, res, next ) {
			var timerKey = [ req.method.toUpperCase(), req.url, 'timer' ].join( ' ' );
			metrics.timer( timerKey ).start();
			res.on( 'finish', function() { 
				metrics.timer( timerKey ).record();
			} );
			next();
		} );
		this.app.use( '/api', function( req, res, next ) {
			if( req.method == 'OPTIONS' || req.method == 'options' ) {
				res.send( 200, this.resources );
			} else {
				next();
			}
		}.bind( this ) );
		this.app.use( express.cookieParser() );
		this.app.use( express.bodyParser( {
			uploadDir: tmp,
			keepExtensions: true
		} ) );
		this.app.use( express.session( { secret: 'authostthing' } ) );

		this.app.use( function( req, res, next ) {
			res.header( 'Access-Control-Allow-Origin', '*' );
			res.header( 'Access-Control-Allow-Headers', 'X-Requested-With' );
			next();
		} );
		
		this.addAuthentication();
		
		_.each( this.middleware, function( mw ) {
			self.app.use( mw.filter, mw.handler );
		} );

		var startServer = function() {
			this.server = http.createServer( this.app ).listen( this.config.port || 8800 );
			this.configureWebsockets();
			this.configureSocketIO();
			console.log( 'autohost listening on port ', ( this.config.port || 8800 ) );
			if (done) done();
		}.bind(this);

		this.app.use( this.app.router );
		this.registerPath( '/', public );
		this.loadResources( resources ).done(function () {
			this.processResource( 'api', require( './_autohost/resource.js' )( this ), path.resolve( __dirname, './_autohost' ) );
			if( this.authorizer ) {
				var list = [];
				_.each( this.actions, function( actions, resource ) {
					_.each( actions, function( action ) {
						list.push( { name: action, resource: resource } );
					} );
				} );
				this.authorizer.actionList( list, function() {
					startServer();
				} );
			} else {
				startServer();
			}
		}.bind(this));

	};

	Host.prototype.registerRoute = function( url, verb, callback ) {
		verb = verb.toLowerCase();
		verb = verb == 'all' || verb == 'any' ? 'use' : verb;
		var routes = this.app.routes[ verb ],
			errors = [ PREFIX, url, verb, 'errors' ].join( '.' );
		if( routes ) {
			var index = routes.indexOf( url );
			if( index >= 0 )
			{
				console.log( 'remove duplicate route for ', url, verb );
				this.app.routes[ verb ].splice( index, 1 );
			}
		}
		if( this.app ) {
			this.app[ verb ]( url, function( req, res ) {
				try {
					callback( req, res );
				} catch ( err ) {
					metrics.meter( errors ).record();
					console.log( 'error on route, "' + url + '" verb "' + verb + '"', err );
				}
			} );
		}
	};

	Host.prototype.registerPath = function( url, filePath ) {
		if( this.app ) {
			this.app.use( url, express[ 'static' ]( path.resolve( filePath ) ) );
		}
	};

	Host.prototype.registerTopic = function( topic, callback ) {
		var timer = [ PREFIX, topic, 'timer' ].join( '.' ),
			errors = [ PREFIX, topic, 'errors' ].join( '.' );
		this.topics[ topic ] = callback;
		_.each( this.clients, function( client ) {
			client.removeAllListeners( topic );
			client.on( topic, function( data ) {
				try {
					metrics.timer( timer ).start();
					callback( data, client );
					metrics.timer( timer ).record();
				} catch ( err ) {
					metrics.meter( errors ).record();
					console.log( 'error on topic, "' + topic + '"', err );
				}
			} );
		} );
	};

	Host.prototype.watch = function( filePath ) {
		var self = this;
		if( !fs.existsSync( filePath ) )
			return;
		return watchTree( filePath,
			_.debounce( function( event ) {
				if( !event.isDirectory() ) {
					self.loadModule( event.name );
				}
			}, 500, true )
		);
	};

	require( './passport.js' )( Host );
	require( './resource.js' )( Host );
	require( './websockets.js' )( Host );
	require( './socketio.js' )( Host );

	Monologue.mixin( Host );
	_.bindAll( Host );
	return new Host();
};