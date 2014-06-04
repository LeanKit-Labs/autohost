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
					selectedActionRoles: [],
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

				this.subscribeTo( 'actions', 'action.selected', function( data ) {
					this.state.selectedActionRoles = data.roles;
					this.setState( this.state );
					Util.enable( '#user-role-list input[type="checkbox"]' );
				}, this );

				this.subscribeTo( 'actions', 'action.unselected', function( data ) {
					this.state.selectedActionRoles = [];
					this.setState( this.state );
					Util.disable( '#user-role-list input[type="checkbox"]' );
					Util.uncheck( '#user-role-list input[type="checkbox"]' );
				}, this );

				this.subscribeTo( 'actions', 'role.assigned', function( data ) {
					this.state.selectedActionRoles.push( data.role );
					this.setState( this.state );
				} );

				this.subscribeTo( 'actions', 'role.unassigned', function( data ) {
					this.state.selectedActionRoles = _.without( this.state.selectedActionRoles, data.role );
					this.setState( this.state );
				} );
				this.subscribeTo( 'api', 'action.categoryList', function(data){
					this.state.selectedActionRoles = [];
					this.setState( this.state );
				} );
			},
			render: function() {
				var self = this;
				var users = _.map( this.state.users, function( user ) {
					var active = _.intersection( this.state.selectedActionRoles, user.roles ).length > 0,
						tag = active ? <b>{user.name}</b> : <span>{user.name}</span>					
					return 	<tr className='assignment'>
								<td>
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