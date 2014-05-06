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
					actions: {}
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'action.list', 'actions' );
				Api.getActions();

				this.subscribeTo( 'roles', 'role.selected', function( data ) {
					this.state.selectedRole = data.role;
					this.setState( this.state );
					Util.enable( '#role-action-list input[type="checkbox"]' );
				}, this );

				this.subscribeTo( 'roles', 'role.unselected', function( data ) {
					this.state.selectedRole = undefined;
					this.setState( this.state );
					Util.disable( '#role-action-list input[type="checkbox"]' );
					Util.uncheck( '#role-action-list input[type="checkbox"]' );
				}, this );
			},
			changed: function( e ) {
				var action = this.getActionByName( e.target.id );
				if( e.target.checked ) {
					action.roles.push( this.state.selectedRole );
				} else {
					action.roles = _.without( action.roles, this.state.selectedRole );
				}
				Api.setActionRoles( e.target.id, action.roles );
				this.setState( this.state );
			},
			getActionByName: function( actionName ) {
				return _.find( _.flatten( _.map( this.state.actions, function( x ) { return x; } ) ), function( x ) { return x.id == actionName; } );
			},
			render: function() {
				var self = this;
				var actions = _.map( this.state.actions, function( actions, resource ) {
					var items = _.map( _.sortBy( actions, 'name' ), function( action ) {
						var active = _.intersection( [ this.state.selectedRole ], action.roles ).length > 0,
							tag = active ? <b>{action.name}</b> : <span>{action.name}</span>
						return 	<tr className='assignment'>
									<td className='check-column'>
										<input type='checkbox' checked={active} id={action.name} onChange={this.changed} disabled={!active}/>
									</td>
									<td>
										{tag}
									</td>
								</tr>;
					}.bind( this ) );
					return (<table className='table table-condensed table-striped table-hover'> 
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
		});
	}
);