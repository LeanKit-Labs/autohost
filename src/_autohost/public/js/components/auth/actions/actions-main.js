/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'jsx!auth/actions/actions',
		'jsx!auth/actions/roleList',
		'jsx!auth/actions/userList'
	], 
	function( $, _, React, Actions, Roles, Users ) { // jshint ignore:line
		var ActionMain = React.createClass( {
			render: function() {
				return (
					/* jshint ignore:start */
					<div className='row left-pad'>
						<div className='col-sm-3'>
							<Actions />
						</div>
						<div className='col-sm-3'>
							<Roles />
						</div>
						<div className='col-sm-3'>
							<Users />
						</div>
					</div>
					/* jshint ignore:end */
				);
			}
		} );
		return ActionMain;
	}
);