var _ = require( 'lodash' ),
	when = require( 'when' ),
	passport = require( 'passport' );

module.exports = function( Host ) {
	var noOp = function() { return when( true ); },
		userCountCheck = noOp,
		unauthCount = 'autohost.unauthorized.count',
		unauthRate = 'autohost.unauthorized.rate',
		authorizationErrorCount = 'autohost.authorization.errors',
		authorizationErrorRate = 'autohost.authorization.error.rate',
		authenticationTimer = 'autohost.authentication.timer',
		authorizationTimer = 'autohost.authorization.timer';

	Host.prototype.addAuthentication = function() {
		if( this.authenticator && this.authenticator.hasUsers ) {
			userCountCheck = this.authenticator.hasUsers;
		}
		if( this.authenticate ) {
			this.app.use( passport.initialize() );
			this.app.use( passport.session() );
			if( this.anonPath ) {
				this.app.all( this.anonPath, function( req, res, next ) {
					req.skipAuthentication = true;
					req.user = {
						id: 'anonymous',
						name: 'anonymous'
					}
					next();
				} );
			}
			this.app.all( '*', function( req, res, next ) {
				userCountCheck()
					.then( function( hasUsers ) {
						if( hasUsers ) {
							userCountCheck = noOp;
							next();
						} else {
							req.skipAuthentication = true;
							req.user = {
								id: 'anonymous',
								name: 'anonymous'
							}
							next();
						}
					} );
			}.bind( this ) );
			this.app.all( '*', function( req, res, next ) {
				if( req.skipAuthentication ) {
					next();
				} else {
					this.metrics.timer( authenticationTimer ).start();
					this.authenticate( req, res, next );
					this.metrics.timer( authenticationTimer ).record();
				}
			}.bind( this ) );
			if( this.authorizer ) {
				this.app.all( '*', function( req, res, next ) {
					this.metrics.timer( authorizationTimer ).start();
					this.authorizer.getUserRoles( req.user.name, function( err, roles ) {
						if( err ) {
							this.metrics.counter( authorizationErrorCount ).incr();
							this.metrics.meter( authorizationErrorRate ).record();
							this.metrics.timer( authorizationTimer ).start();
							res.send( 500, 'Could not determine user permissions' );
						} else {
							req.user.roles = roles;
							this.authorizer.getRolesFor( req.url, function( err, roles ) {
								roles = err ? [] : roles;
								if( roles.length > 0 && _.intersection( roles, req.user.roles ) == 0 ) {
									this.metrics.timer( authorizationTimer ).record();
									this.metrics.counter( unauthCount ).incr();
									this.metrics.meter( unauthRate ).record();
									res.send( 403, 'User lacks sufficient permissions' );
								} else {
									this.metrics.timer( authorizationTimer ).record();
									next();
								}
							}.bind( this ) );
						}
					}.bind( this ) );
				}.bind( this ) );
			}

			passport.serializeUser( function( user, done ) {
				done( null, user );
			} );

			passport.deserializeUser( function( user, done ) {
				done( null, user );
			} );
		}
	};

	Host.prototype.getSocketAuthenticationStrategy = function( request, success, fail ) {
		var strategy = Object.create( this.authenticationStrategy );
		// strategy._realm = this.authenticationRealm;
		// strategy._verify = this.authenticationVerifier;
		_.each( this.authenticationStrategyProperties, function( value, key ) {
			strategy[ key ] = value;
		} );
		strategy.fail = fail;
		strategy.success = success;
		return strategy;
	};

	Host.prototype.withAuthenticationProvider = function( authenticator ) {
		this.authenticator = authenticator;
	}

	Host.prototype.withAuthorizationProvider = function( authorizer ) {
		this.authorizer = authorizer;
	};

	Host.prototype.withPassportStrategy = function( strategy, authenticate, exclude ) {
		this.authenticationStrategy = strategy.constructor.prototype;
		this.authenticationVerifier = strategy._verify;
		this.authenticationRealm = strategy._realm;
		var properties = {};
		_.each( strategy, function( value, key ) { 
			properties[ key ] = value;
		} );
		this.authenticationStrategyProperties = properties;
		passport.use( strategy );
		this.authenticate = authenticate;
		this.anonPath = exclude;
	};
};