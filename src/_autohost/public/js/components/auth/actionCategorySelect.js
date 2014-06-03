/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'components/eventedComponent'
	], 
	function( $, _, React, Api, Evented ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					actions: {},
					newRoleName: '',
					selected: ''
				};
			},
			actionFilterChanged: function(e) {
				var category = e.currentTarget.value;
				console.log('sending ' + this.state.actions[category]);
				this.publish('api', 'action.categoryList', {value: this.state.actions[category]});
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'action.list', 'actions' );
				Api.getActions(true);
			},
			render: function() {
				var categories = _.keys(this.state.actions);
				var categoryOptions = _.map(categories, function(category) {
					return <option>{category}</option>;
				});
				return (
					<div className="row">
						<div className="smalll-3 columns">Resources:</div>
						<div className="smalll-6 columns">
							<select onChange={this.actionFilterChanged}>
								{categoryOptions}
							</select>
						</div>
					</div>
				);
			}
		});
	}
);