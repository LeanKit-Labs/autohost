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
		bootstrap: 'lib/bootstrap.min',
		actions: 'store/actions',
		actionAdapter: 'store/actionAdapter',
		actionChannel: 'store/actionChannel',
		roles: 'store/roles',
		roleAdapter: 'store/roleAdapter',
		roleChannel: 'store/roleChannel',
		users: 'store/users',
		userAdapter: 'store/userAdapter',
		userChannel: 'store/userChannel',
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
	},
	packages: [
		{ name: 'when', location: 'lib/when', main: 'when' }
	]
} );

require( [
		'jquery',
		'react',
		'bootstrap',
		'jsx!resource/main'
	], 
	function($, React, Bootstrap, Home ) {
		var app = window.app = {};
		window.React = React;
		$( function() {
			Home();
		});
	}
);