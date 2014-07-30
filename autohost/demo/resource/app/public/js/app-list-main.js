require.config( {
	baseUrl: 'js',
	paths: {
		jquery: '../../js/lib/jquery',
		marked: '../../js/lib/marked',
		postal: '../../js/lib/postal',
		text: '../../js/lib/text',
		underscore: '../../js/lib/underscore',
		react: '../../js/lib/react.min',
		jsx: '../../js/lib/jsx',
		JSXTransformer: '../../js/lib/JSXTransformer',
		components: 'components',
		api: 'api'
	},
	shim: {
		underscore: {
			exports: 'Underscore'
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
		'jsx!components/app-list'
	], 
	function($, React, AppList) {		
		var app = window.app = {};
		window.React = React;
		$(function() { AppList(); });
	}
);