/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent',
		'jsx!auth/actions/action'
	], 
	function( $, _, React, Api, Util, Evented, Action ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					actions: {},
					newRoleName: '',
					selected: ''
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'action.list', 'actions' );
				Api.getActions();
			},
			render: function() {
				var self = this;
				var actions = _.map( this.state.actions, function( actions, resource ) {
					var items = _.map( _.sortBy( actions, 'name' ), function( action ) {
						return 	<Action name={ action.name } roles={ action.roles } />
					}.bind( this ) );
					return (<table id='action-list' className='table table-condensed table-striped table-hover'> 
								<thead>
									<th>{resource}</th>
								</thead>
								<tbody>
									{items}
								</tbody>
							</table>
					);
				}.bind( this ) );
				return (
					<div>
						{actions}
					</div>
				);
			}
		});
	}
);