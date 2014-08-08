require.config( {
	baseUrl: 'js',
	paths: {
		jquery: 'lib/jquery',
		marked: 'lib/marked',
		postal: 'lib/postal',
		text: 'lib/text',
		lodash: 'lib/lodash',
		underscore: 'lib/lodash',
		react: 'lib/react.min',
		jsx: 'lib/jsx',
		JSXTransformer: 'lib/JSXTransformer',
		components: 'components',
		auth: 'components/auth',
		resource: 'components/resource',
		api: 'api',
		util: 'util',
		bootstrap: 'lib/bootstrap.min'
	},
	shim: {
		bootstrap: {
			exports: 'bootstrap',
			deps: [ 'jquery' ]
		},
		JSXTransformer: {
			exports: 'JSXTransformer'
		},
		react: {
			deps: [ 'jsx', 'JSXTransformer' ],
			exports: [ 'React' ]
		}
	}
} );

require( [
		'jquery',
		'react',
		'bootstrap',
		'jsx!resource/main'
	], 
	function($, React, Bootstrap, Home, io) {
		var app = window.app = {};
		window.React = React;
		$( function() {
			Home();
		});
	}
);