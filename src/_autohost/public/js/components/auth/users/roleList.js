/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'roleChannel',
		'userChannel'
	], 
	function( $, _, React, Events, roles, users ) {
		var UserRoleList = React.createClass( {
			mixins: [ Events ],
			getInitialState: function() {
				return {
					selectedUser: undefined,
					selectedUserRoles: [],
					roles: []
				};
			},
			componentDidMount: function() {
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

				this.subscribeTo( 'users', 'user.selected', function( data ) {
					this.setState( {
						selectedUser: data.user,
						selectedUserRoles: data.roles
					} );
				}, this );

				this.subscribeTo( 'users', 'user.unselected', function( data ) {
					this.setState( {
						selectedUser: undefined,
						selectedUserRoles: []
					} );
				}, this );
			},
			changed: function( e ) {
				var role = e.target.id;
				var user = this.state.selectedUser;
				var userRoles = this.state.selectedUserRoles;
				if( e.target.checked ) {
					userRoles.push( role );
					users.addRole( user, role );
				} else {
					userRoles = _.without( userRoles, role );
					users.removeRole( user, role );
				}
				this.setState( { selectedUserRoles: userRoles } );
			},
			render: function() {
				var self = this,
					user = this.state.selectedUser;
				var roles = _.map( this.state.roles, function( role ) {
					var active = _.intersection( this.state.selectedUserRoles, [ role ] ).length > 0,
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
		return UserRoleList;
	}
);