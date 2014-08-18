define( 
	[ 'should', 'postal', 'userChannel', 'userAdapter', 'users' ], 
function( should, postal, users ) {
	describe( 'when getting user list', function() {
		var result;
		before( function( done ) {
			users.onList( function( list ) {
				result = list;
				done();
			} ).once();
			users.get();
		} );

		it( 'should return expected user list', function() {
			result.should.eql( 
				[
					{
						name: 'one',
						roles: [],
						tokens: [],
						password: 'pass'
					}
				]
			);
		} );
	} );

	describe( 'when adding a role to a user', function() {
		var result;
		before( function( done ) {
			users.onRoleAdded( function( data ) {
				result = data.role;
				done();
			} ).once();
			users.addRole( 'one', 'guest' );
		} );

		it( 'should return successfully from add', function() {
			result.should.equal( 'guest' );
		} );
	} );

	describe( 'when removing a role from a user', function() {
		var result;
		before( function( done ) {
			users.onRoleRemoved( function( data ) {
				result = data.role;
				done();
			} ).once();
			users.removeRole( 'one', 'guest' );
		} );

		it( 'should return successfully from remove', function() {
			result.should.equal( 'guest' );
		} );
	} );

	describe( 'when creating a user', function() {
		var result;
		before( function( done ) {
			users.onCreated( function( data ) {
				result = data.name;
				done();
			} ).once();
			users.create( 'two', 'pass' );
		} );

		it( 'should return successfully from create', function() {
			result.should.equal( 'two' );
		} );
	} );

	describe( 'when changing password', function() {
		var result;
		before( function( done ) {
			users.onPasswordChanged( function( data ) {
				result = data.name;
				done();
			} ).once();
			users.changePassword( 'two', 'noneshallpass' );
		} );

		it( 'should return successfully from change password', function() {
			result.should.equal( 'two' );
		} );
	} );

	describe( 'when disabling user', function() {
		var result;
		before( function( done ) {
			users.onDisabled( function( data ) {
				result = data.name;
				done();
			} ).once();
			users.disable( 'two' );
		} );

		it( 'should return successfully from disable', function() {
			result.should.equal( 'two' );
		} );
	} );

	describe( 'when enabling user', function() {
		var result;
		before( function( done ) {
			users.onEnabled( function( data ) {
				result = data.name;
				done();
			} ).once();
			users.enable( 'two' );
		} );

		it( 'should return successfully from enable', function() {
			result.should.equal( 'two' );
		} );
	} );

	describe( 'when creating a token', function() {
		var result;
		before( function( done ) {
			users.onTokenCreated( function( data ) {
				result = data;
				done();
			} ).once();
			users.createToken();
		} );

		it( 'should return successfully from token create', function() {
			result.should.equal( 'token' );
		} );
	} );

	describe( 'when deleting a token', function() {
		var result;
		before( function( done ) {
			users.onTokenDeleted( function( data ) {
				result = data;
				done();
			} ).once();
			users.deleteToken( 'token' );
		} );

		it( 'should return successfully from token delete', function() {
			result.should.be.true; //jshint ignore:line
		} );
	} );
} );