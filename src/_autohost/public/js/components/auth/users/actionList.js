/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'actionChannel'
	], 
	function( $, _, React, Evented, actions ) {
		var UserActionList = React.createClass( {
			mixins: [ Evented ],
			getInitialState: function() {
				return { 
					selectedUser: undefined,
					selectedUserRoles: [],
					actions: []
				};
			},
			componentWillMount: function() {
				actions.onList( function( list ) {
					this.setState( { actions: list } );
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
			render: function() {
				var actions = _.map( this.state.actions, function( actions, resource ) {
					var displayed = _.filter( actions, function( action ) {
						return _.intersection( this.state.selectedUserRoles, action.roles ).length > 0;
					}.bind( this ) );
					var items = _.map( displayed, function( action ) {
						return <tr className='assignment' key={action.name}>
								<td><span>{action.name}</span></td>
							</tr>
					} );					
					return (<table className='table table-condensed table-striped table-hover' key={resource}> 
								<thead>
									<th colSpan='2'>{resource}</th>
								</thead>
								<tbody>
									{items}
								</tbody>
							</table>
					);
				}.bind( this ) );
				return (
					<div id='user-action-list'>
						{actions}
					</div>
				);
			}
		} );
		return UserActionList;
	}
);