define( 
	[ 'should', 'postal', 'roleChannel', 'roleAdapter', 'roles' ], 
function( should, postal, roles ) {
	
	describe( 'when getting role list', function() {
		var result;
		before( function( done ) {
			roles.onList( function( list ) {
				result = list;
				done();
			} ).once();
			roles.get();
		} );

		it( 'should return expected role list', function() {
			result.should.eql( [ 'guest', 'admin' ] );
		} );
	} );

	describe( 'when adding a role', function() {
		var result;
		before( function( done ) {
			roles.onAdded( function( data ) {
				result = data.name;
				done();
			} ).once();
			roles.add( 'n00b' );
		} );

		it( 'should return successfully from add', function() {
			result.should.equal( 'n00b' );
		} );
	} );

	describe( 'when removing a role', function() {
		var result;
		before( function( done ) {
			roles.onRemoved( function( data ) {
				result = data.name;
				done();
			} ).once();
			roles.remove( 'n00b' );
		} );

		it( 'should return successfully from remove', function() {
			result.should.equal( 'n00b' );
		} );
	} );
} );