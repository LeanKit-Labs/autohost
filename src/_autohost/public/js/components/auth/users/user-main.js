/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent',
		'jsx!auth/users/users',
		'jsx!auth/users/roleList',
		'jsx!auth/users/actionList'
	], 
	function( $, _, React, Api, Util, Evented, Users, Roles, Actions ) {
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
			}
		});
	}
);