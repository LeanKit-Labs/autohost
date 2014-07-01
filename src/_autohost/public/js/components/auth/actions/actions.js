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
				this.subscribeTo( 'api', 'action.categoryList.actions', function( data ) {
					this.state.actions = data.value;
					this.setState( this.state );
				});
				//this.updateOn( 'api', 'action.categoryList.actions', 'actions' );
			},
			componentWillUpdate: function() {
				//console.log(this.state.actions);
			},
			render: function() {
				var self = this;
				return (
					<div>
						<div className="row">
							<div>
								<CategorySelect tabName="actions"/>
							</div>
						</div>
					</div>
				);
			}
		});
	}
);