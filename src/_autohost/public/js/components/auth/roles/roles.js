/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'roleChannel',
		'jsx!auth/roles/role',
		'components/eventedComponent'
	], 
	function( $, _, React, roles, Role, Events ) {
		var Roles = React.createClass( {
			mixins: [ Events ],
			getInitialState: function() {
				return { 
					roles: [],
					newRoleName: '',
					selected: '',
					marked: []
				};
			},
			componentDidMount: function() {
				roles.onList( function( list ) {
					this.setState( { roles: list } );
				}.bind( this ) );

				roles.onAdded( function( data ) {
					var list = this.state.roles.slice();
					list.push( data.name );
					this.setState( {
						newRoleName: '',
						roles: list
					} );
				}.bind( this ) );

				roles.onRemoved( function( data ) {
					var list = _.without( this.state.roles, data.name );
					this.setState( { roles: list } );
				}.bind( this ) );

				this.subscribeTo( 'roles', 'role.marked', function( data ) {
					var marked = this.state.marked;
					if( data.value ) {
						marked.push( data.role );
					} else {
						marked = _.without( marked, data.role );
					}
					this.setState( { marked: marked } );
				}, this );
			},
			newRoleChange: function( e ) {
				this.setState( { newRoleName: e.target.value } );
			},
			addRole: function( e ) {
				roles.add( this.state.newRoleName );
			},
			deleteRoles: function() {
				_.each( this.state.marked, function( role ) {
					roles.remove( role );
				}, this );
			},
			render: function() {
				var self = this;
				var disableDelete = this.state.marked.length > 0 ? false : true;
				var roles = _.map( this.state.roles, function( role ) {
					return <Role key={role} name={role} />;
				} );
				return (
					<table id='role-list' className='table table-condensed table-striped table-hover'>
						<thead>
							<th id='role-addition' className='input-group'>
								<div className='table-style'>
									<input id='newrole' type='text' placeholder='role' className='form-control' onChange={this.newRoleChange} value={this.state.newRoleName}/>
									<span className='input-group-btn'><button id='add-role' type='button' className='btn btn-default' onClick={this.addRole} disabled={!this.state.newRoleName.length}><i className='fa fa-plus fa-md'></i></button></span>
								</div>
							</th>
							<th className='center-align'>
								<a id='delete-roles' href='#' className='btn btn-danger' onClick={this.deleteRoles} disabled={disableDelete}>
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
		} );
		return Roles;
	}
);