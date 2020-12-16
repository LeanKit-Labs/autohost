"use strict";

module.exports = function() {
	return {
		name: "hello",
		actions: {
			default: {
				url: "/",
				method: "GET",
				handle() {
					return "hello world";
				}
			}
		}
	};
};
