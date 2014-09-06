/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'roleChannel',
		'actionChannel'
	], 
	function( $, _, React, Events, roles, actions ) {
		var ActionRoleList = React.createClass( {
			mixins: [ Events ],
			getInitialState: function() {
				return {
					selectedAction: undefined,
					selectedActionRoles: [],
					roles: []
				};
			},
			componentWillMount: function() {
				roles.onList( function( list ) {
					this.setState( { roles: list } );
				}.bind( this ) );

				roles.onAdded( function( data ) {
					var list = this.state.roles.slice();
					list.push( data.name );
					this.setState( { roles: list } );
				}.bind( this ) );

				roles.onRemoved( function( data ) {
					var roles = _.without( this.state.roles, data.name );
					this.setState( { roles: roles } );
				}.bind( this ) );

				this.subscribeTo( 'actions', 'action.selected', function( data ) {
					this.setState( {
						selectedAction: data.action,
						selectedActionRoles: data.roles
					} );
				}, this );

				this.subscribeTo( 'actions', 'action.unselected', function( data ) {
					this.setState( {
						selectedAction: undefined,
						selectedActionRoles: []
					} );
				}, this );
			},
			changed: function( e ) {
				var role = e.target.id,
					action = this.state.selectedAction;
				if( e.target.checked ) {
					this.state.selectedActionRoles.push( role );
					actions.addRole( action, role );
					this.publish( 'actions', 'role.assigned', { role: role } );
				} else {
					this.state.selectedActionRoles = _.without( this.state.selectedActionRoles, role );
					actions.removeRole( action, role );
					this.publish( 'actions', 'role.unassigned', { role: role } );
				}
				this.state.selectedAction.roles = this.state.selectedActionRoles;
				this.setState( this.state );
			},
			render: function() {
				var self = this,
					user = this.state.selectedAction;
				var roles = _.map( this.state.roles, function( role ) {
					var active = _.intersection( this.state.selectedActionRoles, [ role ] ).length > 0,
						tag = active ? <b>{role}</b> : <span>{role}</span>
						return 	<tr className='assignment' key={role}>
									<td className='check-column'>
										<input type='checkbox' checked={active} disabled={!user} id={role} onChange={this.changed}/>
									</td>
									<td>
										{tag}
									</td>
								</tr>;
				}.bind( this ) );
				return (
					<div>
						<table id='user-role-list' className='table table-condensed table-striped table-hover'>
							<thead>
								<th>
								</th>
								<th>
									<div className='table-style'>
										<input id='user-filter' type='text' placeholder='role' className='form-control' onChange={this.userFilterChanged} />
										<span className='input-group-btn'><button id='filter-roles' type='button' className='btn btn-default' disabled='disabled'><i className='fa fa-search fa-md'></i></button></span>
									</div>
								</th>
							</thead>
							<tbody>
								{roles}
							</tbody>
						</table>
					</div>
				);
			}
		} );
		return ActionRoleList;
	}
);