/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'postal',
		'components/eventedComponent',
		'jsx!auth/users/user-main',
		'jsx!auth/roles/roles-main',
		'jsx!auth/actions/actions-main'
	], 
	function( $, _, React, Postal, Evented, Users, Roles, Actions ) {
		return function() {
			var App = React.createClass({
				mixins: [Evented],
				getInitialState: function() {
					return { data: { } };
				},
				switchTabs: function(e) {
					this.publish('actions', 'actions.unfilter', {});
				},
				render: function() {
					return (
						<div>
							<header id='head'>
								<div>
									<h1>Autohost Authorization Manager</h1>
									<h4>Role Assignments For Users &amp; Actions</h4>
								</div>
							</header>
							<div className='topnav navbar navbar-default'>
								<ul className='nav nav-pills'>
									<li>
										<a href='#panel-roles' data-toggle='pill' onClick={this.switchTabs}>Roles</a>
									</li>
									<li>
										<a href='#panel-users' data-toggle='pill' onClick={this.switchTabs}>Users</a>
									</li>
									<li className='active'>
										<a href='#panel-actions' data-toggle='pill' onClick={this.switchTabs}>Actions</a>
									</li>
								</ul>
							</div>
							<div className='container-fluid'>
								<div className='row' >
									<div className='tab-content'>
										<div className='tab-pane fade in' id='panel-roles'>
											<Roles/>
										</div>
										<div className='tab-pane fade in' id='panel-users'>
											<Users />
										</div>
										<div className='tab-pane fade in active' id='panel-actions'>
											<Actions />
										</div>
									</div>
								</div>
							</div>
						</div>
					);
				}
			});
			React.renderComponent(
				<App />,
				document.getElementById('page')
			);
		};
	}
);