/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent',
		'jsx!auth/actionCategorySelect'
	], 
	function( $, _, React, Api, Util, Evented, CategorySelect ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					selectedUser: undefined,
					selectedUserRoles: [],
					actions: []
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'action.categoryList.users', 'actions' );

				this.subscribeTo( 'users', 'user.selected', function( data ) {
					this.state.selectedUser = data.user;
					this.state.selectedUserRoles = data.roles;
					this.setState( this.state );
					Util.enable( '#user-role-list input[type="checkbox"]' );
					this.publish( 'actions', 'actions.filter', { roles: data.roles } );
				}, this );

				this.subscribeTo( 'users', 'user.unselected', function( data ) {
					this.state.selectedUser = undefined;
					this.state.selectedUserRoles = [];
					this.setState( this.state );
					Util.disable( '#user-role-list input[type="checkbox"]' );
					Util.uncheck( '#user-role-list input[type="checkbox"]' );
					this.publish( 'actions', 'actions.unfilter', { roles: data.roles } );
				}, this );
			},
			getActionByName: function( actionName ) {
				return _.find( _.flatten( _.map( this.state.actions, function( x ) { return x; } ) ), function( x ) { return x.id == actionName; } );
			},
			render: function() {
				return (
					<div>
						<div className="row">
							<div>
								<CategorySelect tabName="users"/>
							</div>
						</div>
					</div>
				);
			}
		});
	}
);