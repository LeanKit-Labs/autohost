module.exports = {
	extends: "leankit/test",

	rules: {
		strict: "off",
		"new-cap": 0
	},

	globals: {
		testHelpers: true,
		sinon: true,
		proxyquire: true,
	}
};