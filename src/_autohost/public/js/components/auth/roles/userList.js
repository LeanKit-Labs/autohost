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
					selectedRole: undefined,
					users: []
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'user.list', 'users' );

				this.subscribeTo( 'api', 'user.created', function( data ) {
					if( !data.failed ) {
						this.state.users.push( data.value );
						this.replaceState( this.state );
					}
				}, this );

				this.subscribeTo( 'roles', 'role.selected', function( data ) {
					this.state.selectedRole = data.role;
					this.setState( this.state );
					Util.enable( '#role-user-list input[type="checkbox"]' );
				}, this );

				this.subscribeTo( 'roles', 'role.unselected', function( data ) {
					this.state.selectedRole = undefined;
					this.setState( this.state );
					Util.disable( '#role-user-list input[type="checkbox"]' );
					Util.uncheck( '#role-user-list input[type="checkbox"]' );
				}, this );
			},
			changed: function( e ) {
				var user = _.find( this.state.users, function( user ) {
					return user.name == e.target.id;
				} );
				if( e.target.checked ) {
					user.roles.push( this.state.selectedRole );
					Api.addUserRoles( e.target.id, user.roles );
				} else {
					user.roles = _.without( user.roles, this.state.selectedRole );
					Api.removeUserRoles( e.target.id, [ this.state.selectedRole ] );
				}
				this.setState( this.state );
			},
			render: function() {
				var self = this;
				var users = _.map( this.state.users, function( user ) {
					var active = _.intersection( [ this.state.selectedRole ], user.roles ).length > 0,
						tag = active ? <b>{user.name}</b> : <span>{user.name}</span>					
					return 	<tr className='assignment'>
								<td className='check-column'>
									<input type='checkbox' id={user.name} onChange={this.changed} disabled={!active} checked={active}/>
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
		});
	}
);