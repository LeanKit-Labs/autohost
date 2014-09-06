/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'jsx!auth/users/user',
		'userChannel'
	], 
	function( $, _, React, Evented, User, users ) {
		var Users = React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					users: [],
					newUser: '',
					newPass: '',
					marked: [],
					selected: undefined
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

				users.onDisabled( function( data ) {
					var list = this.state.users;
					var index = _.findIndex( list, { name: data.name } );
					list[ index ].disabled = true;
					this.setState( { users: list } );
				}.bind( this ) );

				users.onEnabled( function( data ) {
					var list = this.state.users;
					var index = _.findIndex( list, { name: data.name } );
					list[ index ].disabled = false;
					this.setState( { users: list } );
				}.bind( this ) );

				this.subscribeTo( 'users', 'user.marked', function( data ) {
					var marked = this.state.marked;
					if( data.value ) {
						marked.push( data.user );
					} else {
						marked = _.without( marked, data.user );
					}
					this.setState( { marked: marked } );
				}, this );
			},
			nameChanged: function( e ) {
				this.setState( { newUser: e.target.value } );
			},
			passwordChanged: function( e ) {
				this.setState( { newPass: e.target.value } );
			},
			addUser: function( e ) {
				users.create( this.state.newUser, this.state.newPass );
			},
			enableUsers: function() {
				_.each( this.state.marked, function( user ) {
					users.enable( user );
				} );
			},
			disableUsers: function() {
				_.each( this.state.marked, function( user ) {
					users.disable( user );
				} );
			},
			render: function() {
				var self = this;
				var users = _.map( this.state.users, function( user ) {
					return <User key={user.name} name={user.name} roles={user.roles} disabled={user.disabled}/>;
				} );
				return (
					<div>
						<div className='input-group' width='100%'>
							<div id='new-user-form' className='table-style'>
								<input id='newname' placeholder='username' type='text' className='form-control' onChange={this.nameChanged} value={this.state.newUser}/>
								<input id='newpass' placeholder='password' type='text' className='form-control' onChange={this.passwordChanged} value={this.state.newPass}/>
								<span className='input-group-btn'><button id='add-user' type='button' className='btn btn-default' onClick={this.addUser} disabled={!this.state.newUser.length || !this.state.newPass.length}><i className='fa fa-plus fa-md'></i></button></span>
							</div>
						</div>
						<table id='role-list' className='table table-condensed table-striped table-hover'>
							<thead>
								<th className='right-align' colSpan='4'>
									<a id='enable-users' href='#' className='btn btn-success' onClick={this.enableUsers} disabled={!this.state.marked.length}>
										<i className='fa fa-check fa-lg'></i>
									</a>
									<a id='disable-users' href='#' className='btn btn-warning' onClick={this.disableUsers} disabled={!this.state.marked.length}>
										<i className='fa fa-ban fa-lg'></i>
									</a>
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
		return Users;
	}
);