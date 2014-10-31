module.exports = function( host, durp1, durp2 ) {
	var resource = {
		name: 'two',
		actions: {
		}
	};
	resource.actions[ durp1 ] = {};
	resource.actions[ durp2 ] = {};
	return resource;
};