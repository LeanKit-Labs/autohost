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
					selectedRole: undefined,
					actions: {}
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'action.categoryList.roles', 'actions' );

				this.subscribeTo( 'roles', 'role.selected', function( data ) {
					this.state.selectedRole = data.role;
					this.setState( this.state );
					Util.enable( '#role-action-list input[type="checkbox"]' );
					this.publish( 'actions', 'actions.filter', { roles: [data.role] } );
				}, this );

				this.subscribeTo( 'roles', 'role.unselected', function( data ) {
					this.state.selectedRole = undefined;
					this.setState( this.state );
					Util.disable( '#role-action-list input[type="checkbox"]' );
					Util.uncheck( '#role-action-list input[type="checkbox"]' );
					this.publish( 'actions', 'actions.unfilter', {} );
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
								<CategorySelect tabName="roles"/>
							</div>
						</div>
					</div>
				);
			}
		});
	}
);