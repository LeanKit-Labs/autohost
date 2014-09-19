/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'actionChannel',
		'components/eventedComponent'
	], 
	function( $, _, React, actions, Events ) {
		var RoleActionList = React.createClass( {
			mixins: [ Events ],
			getInitialState: function() {
				return { 
					selectedRole: undefined,
					actions: {}
				};
			},
			componentDidMount: function() {
				actions.onList( function( list ) {
					this.setState( { actions: list } );
				}.bind( this ) );
				
				// if a role is selected, reflect it in the state and
				// enable checkboxes with any associated actions set to checked
				this.subscribeTo( 'roles', 'role.selected', function( data ) {
					this.setState( { selectedRole: data.role } );
				}, this );

				// if the role is unselected, reflect this in the state and reset
				// the action checkboxes to unchecked and disabled
				this.subscribeTo( 'roles', 'role.unselected', function( data ) {
					this.setState( { selectedRole: undefined } );
				}, this );
			},
			changed: function( e ) {
				var actionName = e.target.id;
				var resourceName = actionName.split( '.' )[ 0 ];
				var obj = this.state.actions;
				var resource = obj[ resourceName ];
				var index = _.findIndex( resource, { name: actionName } );
				if( e.target.checked ) {
					if( _.isEmpty( resource[ index ].roles ) ) {
						resource[ index ].roles = [];
					}
					resource[ index ].roles.push( this.state.selectedRole );
					actions.addRole( actionName, this.state.selectedRole );
				} else {
					resource[ index ].roles = _.without( resource[ index ].roles, this.state.selectedRole );
					actions.removeRole( actionName, this.state.selectedRole );
				}
				this.setState( { actions: obj } );
			},
			render: function() {
				var self = this;
				var actions = _.map( this.state.actions, function( actions, resource ) {
					var items = _.map( _.sortBy( actions, 'name' ), function( action ) {
						var active = _.intersection( [ this.state.selectedRole ], action.roles ).length > 0,
							tag = active ? <b>{action.name}</b> : <span>{action.name}</span>
						return 	<tr className='assignment' key={action.name}>
									<td className='check-column'>
										<input type='checkbox' checked={active} id={action.name} onChange={this.changed} disabled={!this.state.selectedRole}/>
									</td>
									<td>
										{tag}
									</td>
								</tr>;
					}.bind( this ) );
					return ( <table className='table table-condensed table-striped table-hover' key={resource}> 
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
					<div id='role-action-list'>
						{actions}
					</div>
				);
			}
		} );
		return RoleActionList;
	}
);