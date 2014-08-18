/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'userChannel'
	], 
	function( $, _, React, Events, users ) {
		var ActionUserList = React.createClass( {
			mixins: [ Events ],
			getInitialState: function() {
				return {
					selectedActionRoles: [],
					users: []
				};
			},
			componentWillMount: function() {
				users.onList( function( list ) {
					this.setState( { users: list } );
				}.bind( this ) );

				users.onCreated( function( data ) {
					var list = this.state.users.slice();
					list.push( { name: data.name, roles: [] } );
					list = _.uniq( list, function( x ) { return x.name; } );
					this.setState( { users: list } );
				}.bind( this ) );

				this.subscribeTo( 'actions', 'action.selected', function( data ) {
					this.setState( {
						selectedActionRoles: data.roles
					} );
				}, this );

				this.subscribeTo( 'actions', 'action.unselected', function( data ) {
					this.setState( {
						selectedActionRoles: []
					} );
				}, this );
			},
			render: function() {
				var self = this;
				var users = _.map( this.state.users, function( user ) {
					var active = _.intersection( this.state.selectedActionRoles, user.roles ).length > 0,
						tag = active ? <b>{user.name}</b> : <span>{user.name}</span>					
					return 	<tr className='assignment' key={user.name}>
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
		} );
		return ActionUserList;
	}
);