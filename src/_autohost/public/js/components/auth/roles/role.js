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
			cancelPropagation: function( e ) {
				e.stopPropagation();
			},
			changed: function( e ) {
				this.publish( 'roles', 'role.marked', { role: this.props.name, value: e.target.checked } );
			},
			clicked: function( e ) {
				var selected = e.target.tagName == 'TD' ? 
					$( e.target.parentElement ) :
					$( e.target.parentElement.parentElement );

				if( !selected.hasClass( 'info' ) ) {
					$( '.role' ).removeClass( 'info' );
					selected.addClass( 'info' );
					this.publish( 'roles', 'role.selected', { role: this.props.name } );
				} else {
					selected.removeClass( 'info' );
					this.publish( 'roles', 'role.unselected', { role: this.props.name } );
				}
			},
			render: function() {
				return (
					<tr className='role' key='{this.props.name}' onClick={this.clicked}>
						<td className='right-align'>
							<em>{this.props.name}</em>
						</td>
						<td className = 'check-column'>
							<input type='checkbox' onChange={this.changed} onClick={this.cancelPropagation}/>
						</td>
					</tr>
				);
			}
		});
	}
);