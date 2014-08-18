require.config( {
	baseUrl: '/js',
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
		util: 'util',
		bootstrap: 'lib/bootstrap.min',
		mocha: 'lib/mocha',
		should: 'lib/should.min',
		api: '/spec/api.mock',
		actions: 'store/actions',
		actionAdapter: 'store/actionAdapter',
		actionChannel: 'store/actionChannel',
		roles: 'store/roles',
		roleAdapter: 'store/roleAdapter',
		roleChannel: 'store/roleChannel',
		users: 'store/users',
		userAdapter: 'store/userAdapter',
		userChannel: 'store/userChannel',

		actionsSpec: '/spec/actions.spec',
		roleSpec: '/spec/roles.spec',
		userSpec: '/spec/users.spec'
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
		},
		should: {
			exports: [ 'should' ]
		}
	},
	packages: [
		{ name: 'when', location: 'lib/when', main: 'when' }
	]
} );

require( [
		'jquery',
		'should',
		'actionsSpec',
		'roleSpec',
		'userSpec'
	], 
	function( $, should, simple ) { // jshint ignore:line
		$( function() {
			if( window.mochaPhantomJS ) {
				window.mochaPhantomJS.run();
			} else {
				mocha.run(); // jshint ignore:line
			}
		} );
	}
);