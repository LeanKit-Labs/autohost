/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent'
	], 
	function( $, _, React, Evented ) {
		var Action = React.createClass( {
			mixins: [ Evented ],
			getInitialState: function() {
				return { data: {} };
			},
			clicked: function( e ) {
				var selected = e.target.tagName === 'TD' ? 
					$( e.target.parentElement ) :
					$( e.target.parentElement.parentElement );
				if( !selected.hasClass( 'info' ) ) {
					$( '.action' ).removeClass( 'info' );
					selected.addClass( 'info' );
					this.publish( 'actions', 'action.selected', { action: this.props.name, roles: this.props.roles } );
				} else {
					selected.removeClass( 'info' );
					this.publish( 'actions', 'action.unselected', { action: this.props.name, roles: this.props.roles } );
				}
			},
			render: function() {
				/* jshint ignore:start */
				var actionElement = <em>{this.props.name}</em>;
				var rolesIntersection = _.intersection(this.props.roles, this.props.selRoles);
				if (rolesIntersection && rolesIntersection.length > 0) {
					actionElement = <em><b>{this.props.name}</b></em>;
				}
				return (
					<tr className='action' key='{this.props.name}' onClick={this.clicked}>
						<td className='right-align'>
							{actionElement}
						</td>
					</tr>
				);
				/* jshint ignore:end */
			}
		} );
		return Action;
	}
);