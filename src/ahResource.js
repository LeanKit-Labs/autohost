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
					var metrics = host.metrics.getReport();
					if ( envelope.hyped ) {
						envelope.hyped( metrics ).render();
					} else {
						envelope.reply( { data: metrics } );
					}
				}
			}
		}
	};
};
