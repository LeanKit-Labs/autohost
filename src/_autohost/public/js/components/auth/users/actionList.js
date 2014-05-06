/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent'
	], 
	function( $, _, React, Api, Util, Evented ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					selectedUser: undefined,
					selectedUserRoles: [],
					actions: {}
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'action.list', 'actions' );
				Api.getActions();

				this.subscribeTo( 'users', 'user.selected', function( data ) {
					this.state.selectedUser = data.user;
					this.state.selectedUserRoles = data.roles;
					this.setState( this.state );
					Util.enable( '#user-role-list input[type="checkbox"]' );
				}, this );

				this.subscribeTo( 'users', 'user.unselected', function( data ) {
					this.state.selectedUser = undefined;
					this.state.selectedUserRoles = [];
					this.setState( this.state );
					Util.disable( '#user-role-list input[type="checkbox"]' );
					Util.uncheck( '#user-role-list input[type="checkbox"]' );
				}, this );
			},
			getActionByName: function( actionName ) {
				return _.find( _.flatten( _.map( this.state.actions, function( x ) { return x; } ) ), function( x ) { return x.id == actionName; } );
			},
			render: function() {
				var actions = _.map( this.state.actions, function( actions, resource ) {
					var items = _.map( _.sortBy( actions, 'name' ), function( action ) {
						var active = _.intersection( this.state.selectedUserRoles, action.roles ).length > 0,
							tag = active ? <b>{action.name}</b> : <span>{action.name}</span>
						return 	<tr className='assignment'>
									<td>
										{tag}
									</td>
								</tr>;
					}.bind( this ) );
					return (<table className='table table-condensed table-striped table-hover'> 
								<thead>
									<th colSpan='2'>{resource}</th>
								</thead>
								<tbody>
									{items}
								</tbody>
							</table>
					);
				}.bind( this ) );
				return (
					<div id='role-action-list'>
						{actions}
					</div>
				);
			}
		});
	}
);