var _ = require( "lodash" );

	var find = /[:]([^:\/]*)[:]/g,
		replace = /[:]replace[:]/g;

var parser = {
	
	camelCase: function( token ) {
		return _.isEmpty( token.resource ) ? 
				token.property :
				token.resource + token.property[ 0 ].toUpperCase() + token.property.slice( 1 );
	},

	parseRegex: function( regex ) {
		return regex.match( /\/g$/ ) ?
			new RegExp( regex.replace(/\/g$/, "").substring( 1 ), "g" ) :
			new RegExp( regex.substring( 1, regex.length-1 ) );
	},

	parseToken: function ( token ) {
		var parts = token.split( '.' );
		return {
			namespace: parts.length > 2 ? parts.slice( 0, parts.length - 2 ) : "",
			resource: parts.length > 1 ? parts[ parts.length -2 ] : "",
			property: parts[ parts.length -1 ]
		};
	},

	readDataByToken: function( resource, data, token ) {
		var result = ":" + this.camelCase( token ),
			value = undefined;
		if( data ) {
			if( token.resource === "" || token.resource === resource ) {
				value = data[ token.property ];
			} else if( data[ token.resource ] ) {
				value = data[ token.resource ][ token.property ];
			}
		}
		var empty = value === undefined || value === {};
		return empty ? result : value;
	},

	createUrl: function( url, data, resource ) {
		var self = this,
			tokens = [],
			hasReplacement, match, tokenName;
		while( ( match = find.exec( url ) ) ) {
			tokenName = match[ 1 ];
			tokens.push( tokenName );
		}

		if( tokens.length > 0 ) {
			url = this.processTokens( tokens, url, data, resource );
		}
		return url;
	},

	processTokens: function( tokens, url, data, resource ) {
		var next = tokens.pop();
		if( next ) {
			var token = this.parseToken( next ),
				replacement = this.readDataByToken( resource, data, token ),
				stringified, trimmed, replacer, 
				stringified = ( replace.toString() ).replace( /replace/, next ),
				replacer = this.parseRegex( stringified ),
				newUrl = url.replace( replacer, replacement );
			return this.processTokens( tokens, newUrl, data, resource );
		}
		return url;
	}
};

_.bindAll( parser );
module.exports = parser;