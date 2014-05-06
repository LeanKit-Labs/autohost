/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent',
		'jsx!auth/roles/roles',
		'jsx!auth/roles/userList',
		'jsx!auth/roles/actionList'
	], 
	function( $, _, React, Api, Util, Evented, Roles, UserList, ActionList ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					
				};
			},
			componentWillMount: function() {
				
			},
			render: function() {
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
			}
		});
	}
);