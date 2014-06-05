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
					selectedAction: undefined,
					selectedActionRoles: [],
					roles: []
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'role.list', 'roles' );

				this.subscribeTo( 'api', 'role.created', function( data ) {
					if( !data.failed ) {
						this.state.roles.push( data.value );
						this.replaceState( this.state );
					}
				}, this );

				this.subscribeTo( 'actions', 'action.selected', function( data ) {
					this.state.selectedAction = data.action;
					this.state.selectedActionRoles = data.roles;
					this.setState( this.state );
					Util.enable( '#user-role-list input[type="checkbox"]' );
				}, this );

				this.subscribeTo( 'actions', 'action.unselected', function( data ) {
					this.state.selectedAction = undefined;
					this.state.selectedActionRoles = [];
					this.setState( this.state );
					Util.disable( '#user-role-list input[type="checkbox"]' );
					Util.uncheck( '#user-role-list input[type="checkbox"]' );
				}, this );

				this.subscribeTo( 'api', 'action.categoryList.actions', function(data){
					this.state.selectedActionRoles = [];
					this.setState( this.state );
				} );
			},
			changed: function( e ) {
				var role = e.target.id,
					action = this.state.selectedAction;
				if( e.target.checked ) {
					this.state.selectedActionRoles.push( role );
					this.publish( 'actions', 'role.assigned', { role: role } );
				} else {
					this.state.selectedActionRoles = _.without( this.state.selectedActionRoles, role );
					this.publish( 'actions', 'role.unassigned', { role: role } );
				}
				Api.setActionRoles( this.state.selectedAction, this.state.selectedActionRoles );
				this.state.selectedAction.roles = this.state.selectedActionRoles;
				this.setState( this.state );
			},
			render: function() {
				var self = this,
					user = this.state.selectedAction;
				var roles = _.map( this.state.roles, function( role ) {
					var active = _.intersection( this.state.selectedActionRoles, [ role ] ).length > 0,
						tag = active ? <b>{role}</b> : <span>{role}</span>
						return 	<tr className='assignment'>
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
		});
	}
);