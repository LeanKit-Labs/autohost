function middlewareFn( stub ) {
	return proxyquire( '../src/http/middleware', {
		'express-session': stub
	} )();
}

function mockFn() {
	function lib() {
	}
	lib.MemoryStore = function() {
		return { fake: true };
	};
	return sinon.spy( lib );
}

var defaults = {
	name: 'ah.sid',
	secret: 'autohostthing',
	resave: true,
	store: { fake: true },
	saveUninitialized: true,
	rolling: false,
	cookie: {
		path: '/',
		secure: false,
		maxAge: null
	}
};

describe( 'Session Configuration', function() {
	describe( 'Using All Defaults', function() {
		var spy;
		before( function() {
			spy = mockFn();
			var mw = middlewareFn( spy );
			mw.configure( {} );
		} );

		it( 'should pass defaults to session configuration', function() {
			spy.should.always.have.been.calledWithExactly( defaults );
		} );
	} );

	describe( 'Partial Customization', function() {
		var spy;
		before( function() {
			spy = mockFn();
			var mw = middlewareFn( spy );
			mw.configure( {
				session: {
					rolling: true
				},
				cookie: {
					secure: true
				}
			} );
		} );

		it( 'should pass defaults to session configuration', function() {
			spy.should.always.have.been.calledWithExactly( {
				name: 'ah.sid',
				secret: 'autohostthing',
				resave: true,
				store: { fake: true },
				saveUninitialized: true,
				rolling: true,
				cookie: {
					path: '/',
					secure: true,
					maxAge: null
				}
			} );
		} );
	} );

	describe( 'Total Customization', function() {
		var spy;
		before( function() {
			spy = mockFn();
			var mw = middlewareFn( spy );
			mw.configure( {
				session: {
					name: 'test.sid',
					secret: 'test',
					resave: false,
					store: { fake: true },
					saveUninitialized: false,
					rolling: true,
				},
				cookie: {
					path: '/test',
					secure: true,
					maxAge: 100
				}
			} );
		} );

		it( 'should pass defaults to session configuration', function() {
			spy.should.always.have.been.calledWithExactly( {
				name: 'test.sid',
				secret: 'test',
				resave: false,
				store: { fake: true },
				saveUninitialized: false,
				rolling: true,
				cookie: {
					path: '/test',
					secure: true,
					maxAge: 100
				}
			} );
		} );
	} );
} );
