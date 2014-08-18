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
	},
	packages: [
		{ name: 'when', location: 'lib/when', main: 'when' }
	]
} );

require( [
		'jquery',
		'react',
		'bootstrap',
		'jsx!auth/main',
		'actionAdapter',
		'actions',
		'roleAdapter',
		'roles',
		'userAdapter',
		'users'
	], 
	function($, React, Bootstrap, auth) {		
		window.React = React;
		$(function() { 
			auth();
		});
	}
);