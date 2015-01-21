module.exports = function( host ) {
	return {
		name: "ah",
		resources: "./public",
		urlPrefix: "/_ah",
		actions: {
			"metrics": {
				url: "/metrics",
				method: "get",
				handle: function( envelope ) {
					host.metrics.getMetrics( function( metrics ) {
						if ( envelope.hyped ) {
							envelope.hyped( metrics ).render();
						} else {
							envelope.reply( { data: metrics } );
						}
					} );
				}
			}
		}
	};
};
