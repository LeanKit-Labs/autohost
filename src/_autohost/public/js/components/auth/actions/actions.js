/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'util',
		'components/eventedComponent',
		'jsx!auth/actions/action',
		'jsx!auth/actionCategorySelect'
	], 
	function( $, _, React, Api, Util, Evented, Action, CategorySelect ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					actions: [],
					newRoleName: '',
					selected: ''
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'action.categoryList', 'actions' );
			},
			componentWillUpdate: function() {
				console.log(this.state.actions);
			},
			render: function() {
				var self = this;
				var items = _.map( _.sortBy( this.state.actions, 'name' ), function( action ) {
					return 	<Action name={ action.name } roles={ action.roles } />
				}.bind( this ) );
				// return (<table id='action-list' className='table table-condensed table-striped table-hover'> 
				// 			<thead>
				// 				<th>{resource}</th>
				// 			</thead>
				// 			<tbody>
				// 				{items}
				// 			</tbody>
				// 		</table>
				// );
				return (
					<div>
						<div className="row">
							<div>
								<CategorySelect/>
							</div>
						</div>
						<div>
						<table id='action-list' className='table table-condensed table-striped table-hover'> 
						<tbody>
							{items}
						</tbody>
						</table>
						</div>
					</div>
				);
			}
		});
	}
);