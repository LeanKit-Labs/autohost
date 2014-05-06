var urlParse = require( "./urlTemplate.js" );

module.exports = function( _, Renderer ) {

	var RouteBinder = function( config, dispatcher,identityAction ) {
		_.bindAll( this );
		var self = this;
		this.dispatcher = dispatcher;
		this.resources = {};
		this.renderer = new Renderer( config );
		_.each( config, function( v, k ) {
			self.resources[ k ] = v;
		} );
		this.identity = _.isEmpty( identityAction ) ? "self" : identityAction;
		this.identities = {};
	};

	RouteBinder.prototype.buildUrl = function( parent, resource, name, action, rel ) {
		var inherit = action.inherit === undefined ? true : action.inherit,
					prefix = inherit && parent ? ( this.identities[ parent ] || "" ) : "",
					url = prefix + action.url;
					crunched = urlParse.createUrl( url );
		return crunched;
	};

	RouteBinder.prototype.inherits = function( resource, action ) {
		var actionExplicit = action.inherit !== undefined,
			resourceExplicit = resource.inherit !== undefined;
		if( actionExplicit ) {
			return action.inherit;
		} else if ( resourceExplicit ) {
			return resource.inherit;
		} else {
			return true;
		}
	};

	RouteBinder.prototype.bindAction = function( app, parent, resource, name, action, rel ) {
		var self = this,
			inherit = this.inherits( resource, action );
		// if the action SHOULD have a parent but DOES NOT ||
		//		the action SHOULD NOT have a parent but DOES
		// then skip this crap
		if( ( inherit && !parent ) || ( !inherit && parent ) ) {
			return;
		}
		var url = this.buildUrl( parent, resource, name, action, rel );
		if( rel === this.identity ) {
			this.identities[ name ] = url;
		}
		app[ action.method.toLowerCase() ]( url, function( req, resp ) {
			var envelope = {
				data: req.body,
				headers: req.headers,
				params: {},
				reply: function( envelope ) {
					var code = envelope.statusCode || 200,
						hypermedia = self.renderer.render( name, rel, envelope.data ),
						body = hypermedia.list ? hypermedia : _.assign( envelope.data || {}, hypermedia );
					resp.send( code, body );
				}
			};
			for( var key in req.params ) {
				var val = req.params[ key ];
				if( envelope.data[ key ] ) {
					envelope.params[ key ] = val;
				} else {
					envelope.data[ key ] = val;
				}
			}
			self.dispatcher.dispatch( name + "." + rel, envelope );
		} );

		_.each( action.embed, function( embedded ) {
			var embedName = embedded.resource,
				embeddedResource = self.resources[ embedName ];
			_.each( embedded.actions, function( embeddedAction ) {
				self.bindAction( 
					app, 
					name,
					embeddedResource, 
					embedName, 
					embeddedResource.actions[ embeddedAction ],
					embeddedAction );
			} );
		} );
	};

	RouteBinder.prototype.bindOption = function( app ) {
		var self = this;
		app.options( "/", function( req, resp ) {
			try {
				var links = self.renderer.renderOptions();
				resp.send( 200, { links: links } );
			}
			catch ( ex ) {
				resp.send( 500, ex.stack );
			}
		} );
	};

	RouteBinder.prototype.bindResource = function( app, parent, resource, name ) {
		var bindAction = _.partial( this.bindAction, app, parent, resource, name );
		_.each( resource.actions, bindAction );
	};

	RouteBinder.prototype.bind = function( app, parent ) {
		var bindResource = _.partial( this.bindResource, app, parent );
		_.each( this.resources, bindResource );
		this.bindOption( app );
	};

	return RouteBinder;
};