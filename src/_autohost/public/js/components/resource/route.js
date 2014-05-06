/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent'
	], 
	function( $, _, React, Evented ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { data: {} };
			},
			render: function() {
				return (
					<tr>
						<td className='right-align'>
							<em>{this.props.alias}</em>
						</td>
						<td>
							<b>{this.props.verb}</b>
						</td>
						<td>
							{this.props.url}
						</td>
					</tr>
				);
			}
		});
	}
);