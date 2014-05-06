/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'util',
		'react',
		'components/eventedComponent'
	], 
	function( $, _, Util, React, Evented ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { data: {} };
			},
			clicked: function( e ) {
				var selected = e.target.tagName == 'TD' ? 
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
				return (
					<tr className='action' key='{this.props.name}' onClick={this.clicked}>
						<td className='right-align'>
							<em>{this.props.name}</em>
						</td>
					</tr>
				);
			}
		});
	}
);