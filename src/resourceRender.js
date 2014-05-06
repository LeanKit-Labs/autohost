var urlParse = require( "./urlTemplate.js" );

module.exports = function( _ ) {
	var ResourceRender = function( config ) {
		_.bindAll( this );
		var self = this;
		this.resources = {};
		_.each( config, function( v, k ) {
			self.resources[ k ] = v;
		} );
	};

	ResourceRender.prototype.getRepresentation = function( metadata, model ) {
		if( !metadata ) {
			return {};
		} else {
			if( metadata.map ) {
				return metadata.map( model );
			} else if( metadata.properties ) {
				return _.pick( model, metadata.properties )
			} else {
				return model;
			}
		}	
	};

	ResourceRender.prototype.getEmbedded = function( metadata, model, parentUrl ) {
		var self = this,
			embed = {};
		if( metadata && metadata.embed && model ) {
			_.each( metadata.embed, function( embedded, key ) {
				embed[ key ] = _.map( model[ key ], function( item ) { 
					return self.render( embedded.resource, embedded.action, item, parentUrl );
				} );
			} );
		}
		return embed;
	};

	ResourceRender.prototype.inherits = function( metadata, action ) {
		var actionExplicit = action.inherit !== undefined,
			resourceExplicit = metadata.inherit !== undefined;
		if( actionExplicit ) {
			return action.inherit;
		} else if ( resourceExplicit ) {
			return metadata.inherit;
		} else {
			return true;
		}
	};

	ResourceRender.prototype.getLinks = function( resource, metadata, model, parentUrl ) {
		var self = this,
			links = {};
		if( metadata ) {
			_.each( metadata, function( action, name ) {
				var inherit = self.inherits( self.resources[ resource ], action ),
					option = !model,
					prefix = inherit ? ( parentUrl || "" ) : "",
					url = prefix + urlParse.createUrl( action.url, model, resource ),
					valid = ( option && !inherit && url.indexOf( ":" ) < 0 ) || ( !option );
				if( valid ) {
					links[ name ] = {
						href: url,
						method: action.method
					};
				}
			} );
		}
		return links;
	};

	ResourceRender.prototype.render = function( resource, action, model, parentUrl ) {
		if( model && _.isArray( model ) ) {
			return this.renderList( resource, action, model, parentUrl );
		} else {
			return this.renderSingle( resource, action, model, parentUrl );
		}
	};

	ResourceRender.prototype.renderSingle = function( resource, action, model, parentUrl ) {
		var metadata = this.resources[ resource ].actions[ action ];
		var body = this.getRepresentation( metadata, model );
		body._links = this.getLinks( resource, this.resources[ resource ].actions, model, parentUrl );
		var parent = body._links.self ? body._links.self.href : "",
			embedded = this.getEmbedded( metadata, model, parent );
		if( !_.isEmpty( embedded ) ) {
			body._embedded = embedded;
		}
		return body;
	};

	ResourceRender.prototype.renderList = function( resource, action, list, parentUrl ) {
		var self = this,
			list = { list: _.map( list, function( item ) {
				return self.renderSingle( resource, action, item, parentUrl );
			} ) };
		return list;
	};

	ResourceRender.prototype.renderOptions = function() {
		var self = this,
			args = _.flatten( 
				_.map( self.resources, function( resource, name ) {
					return self.getLinks( name, resource.actions );
				} )
			);
		args.unshift( {} );
		return _.assign.apply( undefined, args );
	};

	return ResourceRender;
};