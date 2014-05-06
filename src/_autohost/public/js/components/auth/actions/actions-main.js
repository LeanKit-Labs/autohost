/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent',
		'jsx!auth/actions/actions',
		'jsx!auth/actions/roleList',
		'jsx!auth/actions/userList'
	], 
	function( $, _, React, Api, Util, Evented, Actions, Roles, Users ) {
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
							<Actions />
						</div>
						<div className='col-sm-3'>
							<Roles />
						</div>
						<div className='col-sm-3'>
							<Users />
						</div>
					</div>
				);
			}
		});
	}
);