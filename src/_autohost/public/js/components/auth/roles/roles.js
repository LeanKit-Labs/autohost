/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent',
		'jsx!auth/roles/role'
	], 
	function( $, _, React, Api, Util, Evented, Role ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					roles: [],
					newRoleName: '',
					selected: '',
					marked: []
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'role.list', 'roles' );

				this.subscribeTo( 'api', 'role.added', function( data ) {
					if( !data.failed ) {
						this.state.roles.push( data.value );
						this.state.newRole = '';
						this.replaceState( this.state );
					}
				}, this );

				this.subscribeTo( 'api', 'role.removed', function( data ) {
					var index = this.state.roles.indexOf( data.value );
					this.state.roles.splice( index, 1 );
					this.setState( this.state );
				}, this );

				this.subscribeTo( 'roles', 'role.marked', function( data ) {
					if( data.value ) {
						this.state.marked.push( data.role );
						this.setState( this.state );
					} else {
						var index = this.state.marked.indexOf( data.role );
						this.state.marked.splice( index, 1 );
						this.setState( this.state );
					}
					if( this.state.marked.length ) {
						Util.enable( '#delete-roles' );
					} else {
						Util.disable( '#delete-roles' );
					}
				}, this );

				Api.getRoles();
			},
			newRoleChange: function( e ) {
				this.setState( { newRoleName: e.target.value } );
			},
			addRole: function( e ) {
				Api.addRole( this.state.newRoleName );		
			},
			deleteRoles: function() {
				_.each( this.state.marked, function( role ) {
					Api.removeRole( role );
				}, this );
			},
			render: function() {
				var self = this;
				var roles = _.map( this.state.roles, function( role ) {
					return <Role key={role} name={role} />;
				} );
				return (
					<table id='role-list' className='table table-condensed table-striped table-hover'>
						<thead>
							<th id='role-addition' className='input-group'>
								<div className='table-style'>
									<input id='newrole' type='text' placeholder='role' className='form-control' onChange={this.newRoleChange} value={this.state.newRole}/>
									<span className='input-group-btn'><button id='add-role' type='button' className='btn btn-default' onClick={this.addRole} disabled={!this.state.newRoleName.length}><i className='fa fa-plus fa-md'></i></button></span>
								</div>
							</th>
							<th className='center-align'>
								<a id='delete-roles' href='#' className='btn btn-danger' onClick={this.deleteRoles} disabled='disabled'>
									<i className='fa fa-trash-o fa-lg'></i>
								</a>
							</th>
						</thead>
						<tbody>
							{roles}
						</tbody>
					</table>
				);
			}
		});
	}
);