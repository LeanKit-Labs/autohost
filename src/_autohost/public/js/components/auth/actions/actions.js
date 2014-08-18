/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'jsx!auth/actions/action',
		'actionChannel'
	], 
	function( $, _, React, Evented, Action, actions ) {
		return React.createClass( {
			mixins: [ Evented ],
			getInitialState: function() {
				return { 
					actions: [],
					selectedResource: undefined,
				};
			},
			componentDidMount: function() {
				actions.onList( function( list ) {
					this.setState( { actions: list } );
				}.bind( this ) );
			},
			clicked: function( e ) {
				var selected = e.target.tagName === 'li' ? 
					e.target.id :
					e.target.parentElement.id;
				this.setState( { selectedResource: selected.toString() } );
			},
			render: function() {
				var self = this;
				var resources = _.keys( this.state.actions );
				var choices = _.map( resources, function( resource ) {
					return <li role='presentation' id={resource}><a role='menuitem' href='#' key={resource} onClick={this.clicked}>{resource}</a></li>;
				}.bind( this ) );
				choices.unshift( <li role='presentation'><a role='menuitem' href='#' key='all' onClick={this.clicked}>[all resources]</a></li> );
				var selected = this.selectedResource;
				var actions = _.transform( this.state.actions, function( result, actions, resource ) {
					if( this.state.selectedResource ? this.state.selectedResource === resource : true ) {
						var items = _.map( actions, function( action ) {
							return <Action name={action.name} roles={action.roles} key={action.name}/>
						} );
						var container = (
							<table className='table table-condensed table-striped table-hover' key={resource}> 
								<thead>
									<th colSpan='2'>{resource}</th>
								</thead>
								<tbody>
									{items}
								</tbody>
							</table>
						);
						result.push( container );
					}
				}.bind( this ), [] );
				return (
					<div>
						<div className='dropdown'>
							<button data-toggle='dropdown' href='#' className='btn btn-default dropdown-toggle wide-button'>
								{this.state.selectedResource || '[all resources]'}
								<span className='caret'></span>
							</button>
							<ul className='dropdown-menu' role='menu'>
								{choices}
							</ul>
						</div>
						<div id='user-action-list'>
							{actions}
						</div>
					</div>
				);
			}
		} );
	}
);