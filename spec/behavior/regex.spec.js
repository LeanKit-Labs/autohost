require( '../setup' );
var regex = require( '../../src/http/regex.js' );

describe( 'URL Regex', function() {
	describe( 'when matching a thing with things', function() {
		var match = /^\/views\//;
		var url1 = '/views/thing/look/at/all/this';
		var url2 = '/nothing/views';
		var url1Match, url2Match;

		before( function() {
			var pattern = regex.prefix( '', match );
			url1Match = pattern.test( url1 );
			url2Match = pattern.test( url2 );
		} );

		it( 'it should match URLs beginning with views', function() {
			url1Match.should.be.true;
		} );

		it( 'it should not match URLs with views all willy-nilly', function() {
			url2Match.should.be.false;
		} );
	} );

	describe( 'when pattern contains ^', function() {
		var prefix = '/api';
		var url1 = '/api/board/10/user';
		var url2 = '/board/10/user';
		var url3 = '/api/user/10/board';
		var match = /^board/;
		var url1Match, url2Match, url3Match;

		before( function() {
			var pattern = regex.prefix( prefix, match );
			url1Match = pattern.test( url1 );
			url2Match = pattern.test( url2 );
			url3Match = pattern.test( url3 );
		} );


		it( 'it should match URLs beginning with the correct prefix', function() {
			url1Match.should.be.true;
		} );

		it( 'it should not match URLs missing the prefix', function() {
			url2Match.should.be.false;
		} );

		it( 'it should not match URLs that are partial matches', function() {
			url3Match.should.be.false;
		} );
	} );

	describe( 'when pattern does not contain ^', function() {
		var prefix = '/api';
		var url1 = '/api/board/10/user';
		var url2 = '/board/10/user';
		var url3 = '/api/user';
		var match = /.+\/user/;
		var url1Match, url2Match, url3Match;

		before( function() {
			var pattern = regex.prefix( prefix, match );
			url1Match = pattern.test( url1 );
			url2Match = pattern.test( url2 );
			url3Match = pattern.test( url3 );
		} );


		it( 'it should match URLs beginning with the correct prefix', function() {
			url1Match.should.be.true;
		} );

		it( 'it should not match URLs missing the prefix', function() {
			url2Match.should.be.false;
		} );

		it( 'it should not match URLs that are partial matches', function() {
			url3Match.should.be.false;
		} );
	} );

	describe( 'when pattern contains leading forward slash after ^', function() {
		var prefix = '/api';
		var url1 = '/api/views/this/is/dumb';
		var url2 = '/board/10/user';
		var url3 = '/api/user';
		var match = /^\/views\//;
		var url1Match, url2Match, url3Match;

		before( function() {
			var pattern = regex.prefix( prefix, match );
			url1Match = pattern.test( url1 );
			url2Match = pattern.test( url2 );
			url3Match = pattern.test( url3 );
		} );


		it( 'it should match URLs beginning with the correct prefix', function() {
			url1Match.should.be.true;
		} );

		it( 'it should not match URLs missing the prefix', function() {
			url2Match.should.be.false;
		} );

		it( 'it should not match URLs that are partial matches', function() {
			url3Match.should.be.false;
		} );
	} );

	describe( 'when pattern contains leading forward slash without ^', function() {
		var prefix = '/api';
		var url1 = '/api/test/user/this/is/dumb';
		var url2 = '/board/10/user';
		var url3 = '/api/user';
		var match = /\/user\//;
		var url1Match, url2Match, url3Match;

		before( function() {
			var pattern = regex.prefix( prefix, match );
			url1Match = pattern.test( url1 );
			url2Match = pattern.test( url2 );
			url3Match = pattern.test( url3 );
		} );


		it( 'it should match URLs beginning with the correct prefix', function() {
			url1Match.should.be.true;
		} );

		it( 'it should not match URLs missing the prefix', function() {
			url2Match.should.be.false;
		} );

		it( 'it should not match URLs that are partial matches', function() {
			url3Match.should.be.false;
		} );
	} );

	describe( 'when pattern is already prefixed', function() {
		var prefix = '/pre/fixed';
		var url1 = '/pre/fixed/test/user/this/is/dumb';
		var url2 = '/board/10/user';
		var url3 = '/pre/fixed/user';
		var match = /\/pre\/fixed\/user[\/]?/;
		var url1Match, url2Match, url3Match;

		before( function() {
			var pattern = regex.prefix( prefix, match );
			url1Match = pattern.test( url1 );
			url2Match = pattern.test( url2 );
			url3Match = pattern.test( url3 );
		} );

		it( 'it should match URLs beginning with the correct prefix', function() {
			url3Match.should.be.true;
		} );

		it( 'it should not match URLs missing the prefix', function() {
			url2Match.should.be.false;
		} );

		it( 'it should not match URLs with additional segments between prefix and pattern', function() {
			url1Match.should.be.false;
		} );
	} );
} );
