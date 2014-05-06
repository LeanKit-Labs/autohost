/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent',
		'jsx!auth/users/user'
	], 
	function( $, _, React, Api, Util, Evented, User ) {
		return React.createClass({
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
				this.updateOn( 'api', 'user.list', 'users' );
				this.subscribeTo( 'api', 'user.created', function( data ) {
					if( !data.failed ) {
						this.state.users.push( data.value );
						this.state.newUser = '';
						this.state.newPass = '';
						this.replaceState( this.state );
					}
				}, this );

				this.subscribeTo( 'api', 'user.disabled', function( data ) {
					var user = this.getUserByName( data.value );
					user.disabled = true;
					this.setState( this.state );
				}, this );

				this.subscribeTo( 'api', 'user.enabled', function( data ) {
					var user = this.getUserByName( data.value );
					delete user.disabled;
					this.setState( this.state );
				}, this );

				this.subscribeTo( 'users', 'user.marked', function( data ) {
					if( data.value ) {
						this.state.marked.push( data.user );
					} else {
						var index = this.state.marked.indexOf( data.user );
						this.state.marked.splice( index, 1 );
					}
					this.setState( this.state );
				}, this );

				Api.getUsers();
			},
			getUserByName: function( userName ) {
				return _.find( this.state.users, function( x ) { return x.id == userName; } );
			},
			nameChanged: function( e ) {
				this.setState( { newUser: e.target.value } );
			},
			passwordChanged: function( e ) {
				this.setState( { newPass: e.target.value } );
			},
			addUser: function( e ) {
				Api.createUser( this.state.newUser, this.state.newPass );			
			},
			enableUsers: function() {
				_.each( this.state.marked, function( user ) {
					Api.enableUser( user );
				}, this );
			},
			disableUsers: function() {
				_.each( this.state.marked, function( user ) {
					Api.disableUser( user );
				}, this );
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
		});
	}
);