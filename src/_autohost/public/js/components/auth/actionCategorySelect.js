/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'jsx!auth/actions/action',
		'components/eventedComponent'
	], 
	function( $, _, React, Api, Action, Evented ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					actions: {},
					newRoleName: '',
					selectedCategory: null,
					filteredActions: [],
					selectedRoles: null
				};
			},
			actionFilterChanged: function(e) {
				var category = $(e.currentTarget).children(":selected").attr("id");
				this.state.selectedCategory = category;
				this.setState( this.state );
				this.publish('api', 'action.categoryList.' + this.props.tabName, {value: this.state.actions[category]});
			},
			componentWillMount: function() {
				this.subscribeTo( 'api', 'action.list', function( data ) {
					this.state.actions = data.value;
					this.state.filteredActions = data.value;
					this.setState( this.state );
				});
				Api.getActions(true);

				this.subscribeTo( 'actions', 'actions.filter', function( data ) {
					var actionRoleList = {};
					var categories = _.keys(this.state.actions);
					_.forEach(categories, function(actionCat) {
						_.forEach(this.state.actions[actionCat], function(action) {
							var roleExists = _.any(action.roles, function(role) {
								return _.contains(data.roles, role);
							});
							if (roleExists) {
								if (!actionRoleList[actionCat]) {
									actionRoleList[actionCat] = [];
								}
								actionRoleList[actionCat].push(action);
							}
						})
					}.bind(this));
					this.state.filteredActions = actionRoleList;
					this.state.selectedCategory = null;
					this.state.selectedRoles = data.roles;					
					this.setState( this.state );
				});
				this.subscribeTo( 'actions', 'actions.unfilter', function( data ) {
					this.state.selectedCategory = null;
					this.state.selectedRoles = null;				
					this.state.filteredActions = this.state.actions;
					this.setState( this.state );
				});
			},
			render: function() {
				var selCat = this.state.selectedCategory;
				var categories = _.keys(this.state.filteredActions);
				var categoryOptions = _.map(categories, function(category) {
					var catItemCount = this.state.filteredActions[category].length;
					if (!selCat) {
						selCat = category;
					}
					if (selCat == category) {
						return <option id={category} selected>{category} - ({catItemCount})</option>;
					} else {
						return <option id={category}>{category} - ({catItemCount})</option>;
					}
					
				}.bind(this));

				var items = _.map( _.sortBy( this.state.actions[selCat], 'name' ), function( action ) {
					return 	<Action name={ action.name } roles={ action.roles } selRoles={this.state.selectedRoles} />
				}.bind( this ) );


				return (
					<div className="row">
						<div className="smalll-3 columns">Resources:</div>
						<div className="smalll-6 columns">
							<select onChange={this.actionFilterChanged} id="categoryList">
								{categoryOptions}
							</select>
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