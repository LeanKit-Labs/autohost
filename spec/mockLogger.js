var namespaces = {};
var recent = {};
var adapter = {
	namespaces: namespaces,
	init: function( ns ) {
		if ( !namespaces[ ns ] ) {
			namespaces[ ns ] = { entries: [] };
		}
		namespaces[ ns ].entries = {
			info: [],
			debug: [],
			warn: [],
			error: []
		};
		recent = {};
		return namespaces[ ns ];
	},
	reset: function( ns ) {
		this.init( ns );
	},
	onLog: function( data ) {
		var ns = namespaces[ data.namespace ];
		if ( !ns ) {
			ns = this.init( data.namespace );
		}
		ns.entries[ data.type ].push( data.msg );
		if ( !recent[data.type] ) {
			recent[data.type] = [];
		}
		recent[data.type].push( data.msg );
	},
	recent: function( type ) {
		if ( type ) {
			return recent[type];
		}
		return recent;
	}
};

_.bindAll( adapter );

module.exports = function mockLogAdapter( config ) {
	if ( _.isObject( config ) ) {
		return adapter;
	} else if ( config ) {
		var ns = _.isArray( config ) ? config : [ config ];
		ns.forEach( adapter.init.bind( adapter ) );
		return adapter;
	} else {
		return namespaces;
	}
};
