require.config( {
	baseUrl: 'js',
	paths: {
		jquery: 'lib/jquery',
		marked: 'lib/marked',
		postal: 'lib/postal',
		text: 'lib/text',
		lodash: 'lib/lodash',
		react: 'lib/react-with-addons',
		jsx: 'lib/jsx',
		JSXTransformer: 'lib/JSXTransformer',
		components: 'components',
		auth: 'components/auth',
		resource: 'components/resource',
		api: 'api',
		bootstrap: 'lib/bootstrap.min',
		util: 'util'
	},
	shim: {
		bootstrap: {
			exports: 'bootstrap',
			deps: [ 'jquery' ]
		},
		lodash: {
			exports: [ 'lodash' ]
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
		'jsx!auth/main'
	], 
	function($, React, Bootstrap, Auth) {		
		var app = window.app = {};
		window.React = React;
		$(function() { 
			Auth();
		});
	}
);