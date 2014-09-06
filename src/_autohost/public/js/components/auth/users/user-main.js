/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'jsx!auth/users/users',
		'jsx!auth/users/roleList',
		'jsx!auth/users/actionList'
	], 
	function( $, _, React, Users, Roles, Actions ) { // jshint ignore:line
		var UserMain = React.createClass( {
			render: function() {
				/* jshint ignore:start */
				return (
					<div className='row left-pad'>
						<div className='col-sm-4'>
							<Users />
						</div>
						<div className='col-sm-3'>
							<Roles />
						</div>
						<div className='col-sm-4'>
							<Actions />
						</div>
					</div>
				);
				/* jshint ignore:end */
			}
		} );
		return UserMain;
	}
);