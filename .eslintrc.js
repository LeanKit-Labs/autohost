"use strict";

module.exports = {
	extends: [ "leankit", "leankit/es6" ],
	rules: {
		strict: [ "error", "global" ],
		"init-declarations": 0,
		"global-require": 0,
		"max-statements": [ "error", { max: 35 } ]
	},
	parserOptions: {
		ecmaVersion: 2017
	}
};
