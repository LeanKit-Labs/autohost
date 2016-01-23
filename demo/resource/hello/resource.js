module.exports = function() {
	return {
		name: "hello",
		actions: {
			default: {
				url: "/",
				method: "GET",
				handle: function() {
					return "hello world";
				}
			}
		}
	};
};