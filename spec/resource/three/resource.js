module.exports = function( host ) {
	var fount = host.fount;
	fount.register( "missingDependency", "somethingImportant" );
	return fount.inject( function( missingDependency ) {
		return {
			name: missingDependency,
			resources: "public",
			actions: {
				self: {

				}
			}
		};
	} );
};
