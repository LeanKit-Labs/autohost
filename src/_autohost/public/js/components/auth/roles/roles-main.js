/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'jsx!auth/roles/roles',
		'jsx!auth/roles/userList',
		'jsx!auth/roles/actionList'
	], 
	function( $, _, React, Roles, UserList, ActionList ) { // jshint ignore:line
		var RoleMain = React.createClass( {
			render: function() {
				/* jshint ignore:start */
				return (
					<div className='row left-pad'>
						<div className='col-sm-3'>
							<Roles />
						</div>
						<div className='col-sm-3'>
							<UserList />
						</div>
						<div className='col-sm-4'>
							<ActionList />
						</div>
					</div>
				);
				/* jshint ignore:end */
			}
		} );
		return RoleMain;
	}
);