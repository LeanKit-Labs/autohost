define( 
	[ 'should', 'postal', 'actionChannel', 'actionAdapter', 'actions' ], 
function( should, postal, actions ) {
	describe( 'when getting action list', function() {
		var result;
		before( function( done ) {
			actions.onList( function( list ) {
				result = list;
				done();
			} ).once();
			actions.get();
		} );

		it( 'should return expected action list', function() {
			result.should.eql( 
				{ thing: [
					{ 
						name: 'thing.view',
						resource: 'thing',
						roles: []
					},
					{ 
						name: 'thing.create',
						resource: 'thing',
						roles: []
					},
					{ 
						name: 'thing.update',
						resource: 'thing',
						roles: []
					},
					{ 
						name: 'thing.delete',
						resource: 'thing',
						roles: []
					}
				] }
			);
		} );
	} );

	describe( 'when adding a role to action', function() {
		var result;
		before( function( done ) {
			actions.onRoleAdded( function( data ) {
				result = data.role;
				done();
			} ).once();
			actions.addRole( 'thing.view', 'guest' );
		} );

		it( 'should return successfully from add', function() {
			result.should.equal( 'guest' );
		} );
	} );

	describe( 'when removing a role from action', function() {
		var result;
		before( function( done ) {
			actions.onRoleRemoved( function( data ) {
				result = data.role;
				done();
			} ).once();
			actions.removeRole( 'thing.view', 'guest' );
		} );

		it( 'should return successfully from remove', function() {
			result.should.equal( 'guest' );
		} );
	} );
} );