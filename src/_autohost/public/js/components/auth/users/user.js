/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent'
	], 
	function( $, _, React, Evented ) {
		var User = React.createClass( {
			mixins: [ Evented ],
			getInitialState: function() {
				return { data: {} };
			},
			cancelPropagation: function( e ) {
				e.stopPropagation();
			},
			changed: function( e ) {
				this.publish( 'users', 'user.marked', { user: this.props.name, value: e.target.checked } );
			},
			clicked: function( e ) {
				var selected = e.target.tagName === 'TD' ? 
					$( e.target.parentElement ) :
					$( e.target.parentElement.parentElement );

				if( !selected.hasClass( 'info' ) ) {
					$( '.user' ).removeClass( 'info' );
					selected.addClass( 'info' );
					this.publish( 'users', 'user.selected', { user: this.props.name, roles: this.props.roles } );
				} else {
					selected.removeClass( 'info' );
					this.publish( 'users', 'user.unselected', { user: this.props.name } );
				}
			},
			render: function() {
				var emblem = this.props.disabled ?
					<span className='red'><i className='fa fa-times-circle-o fa-lg'></i></span>:
					<span className='green'><i className='fa fa-check-circle-o fa-lg'></i></span>;
				return (
					<tr className='user' onClick={this.clicked} >
						<td className='center-align'>
							{emblem}
						</td>
						<td className='right-align'>
							<em>{this.props.alias || this.props.name }</em>
						</td>
						<td>
							<b>{this.props.name}</b>
						</td>
						<td className = 'check-column'>
							<input type='checkbox' onChange={this.changed} onClick={this.cancelPropagation}/>
						</td>
					</tr>
				);
			}
		} );
		return User;
	}
);