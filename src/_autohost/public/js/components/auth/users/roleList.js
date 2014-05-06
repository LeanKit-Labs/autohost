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
			changed: function( e ) {
				var role = e.target.id,
					user = this.state.selectedUser;
				if( e.target.checked ) {
					this.state.selectedUserRoles.push( role );
					Api.addUserRoles( user, this.state.selectedUserRoles );
				} else {
					this.state.selectedUserRoles = _.without( this.state.selectedUserRoles, role );
					Api.removeUserRoles( user, [ role ] );		
				}
				this.state.selectedUser.roles = this.state.selectedUserRoles;
				this.setState( this.state );
			},
			render: function() {
				var self = this,
					user = this.state.selectedUser;
				var roles = _.map( this.state.roles, function( role ) {
					var active = _.intersection( this.state.selectedUserRoles, [ role ] ).length > 0,
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