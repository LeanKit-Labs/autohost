var should = require( 'should' ); //jshint ignore:line
var regex = require( '../src/http/regex.js' );

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
		url1Match.should.be.true; // jshint ignore:line
	} );

	it( 'it should not match URLs with views all willy-nilly', function() {
		url2Match.should.be.false; // jshint ignore:line
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
		url1Match.should.be.true; // jshint ignore:line
	} );

	it( 'it should not match URLs missing the prefix', function() {
		url2Match.should.be.false; // jshint ignore:line
	} );

	it( 'it should not match URLs that are partial matches', function() {
		url3Match.should.be.false; // jshint ignore:line
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
		url1Match.should.be.true; // jshint ignore:line
	} );

	it( 'it should not match URLs missing the prefix', function() {
		url2Match.should.be.false; // jshint ignore:line
	} );

	it( 'it should not match URLs that are partial matches', function() {
		url3Match.should.be.false; // jshint ignore:line
	} );
} );