/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'userChannel',
		'components/eventedComponent'
	], 
	function( $, _, React, users, Events ) {
		var RoleUserList = React.createClass( {
			mixins: [ Events ],
			getInitialState: function() {
				return {
					selectedRole: undefined,
					users: []
				};
			},
			componentDidMount: function() {
				users.onList( function( list ) {
					this.setState( { users: list } );
				}.bind( this ) );

				users.onCreated( function( data ) {
					var list = this.state.users.slice();
					list.push( { name: data.name, roles: [] } );
					list = _.uniq( list, function( x ) { return x.name; } );
					this.setState( { users: list } );
				}.bind( this ) );

				this.subscribeTo( 'roles', 'role.selected', function( data ) {
					this.setState( { selectedRole: data.role } );
				}, this );

				this.subscribeTo( 'roles', 'role.unselected', function( data ) {
					this.setState( { selectedRole: undefined } );
				}, this );
			},
			changed: function( e ) {
				var list = this.state.users;
				var user = _.find( list, { name: e.target.id } );
				var index = _.findIndex( list, { name: e.target.id } );
				if( e.target.checked ) {
					user.roles.push( this.state.selectedRole );
					users.addRole( e.target.id, this.state.selectedRole );
				} else {
					user.roles = _.without( user.roles, this.state.selectedRole );
					users.removeRole( e.target.id, this.state.selectedRole );
				}
				list[ index ] = user;
				this.setState( { users: list } );
			},
			render: function() {
				var self = this;
				var users = _.map( this.state.users, function( user ) {
					var active = _.intersection( [ this.state.selectedRole ], user.roles ).length > 0,
						tag = active ? <b>{user.name}</b> : <span>{user.name}</span>					
					return 	<tr className='assignment' key={user.name}>
								<td className='check-column'>
									<input type='checkbox' id={user.name} onChange={this.changed} disabled={!this.state.selectedRole} checked={active}/>
								</td>
								<td>
									{tag}
								</td>
							</tr>;
				}.bind( this ) );
				return (
					<div>
						<table id='role-user-list' className='table table-condensed table-striped table-hover'>
							<thead>
								<th>
								</th>
								<th>
									<div className='table-style'>
										<input id='user-filter' type='text' placeholder='username' className='form-control' onChange={this.userFilterChanged} />
	              						<span className='input-group-btn'><button id='filter-users' type='button' className='btn btn-default' disabled='disabled'><i className='fa fa-search fa-md'></i></button></span>
	              					</div>
								</th>
							</thead>
							<tbody>
								{users}
							</tbody>
						</table>
					</div>
				);
			}
		} );
		return RoleUserList;
	}
);