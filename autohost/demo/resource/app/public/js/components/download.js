/** @jsx React.DOM */
define( [ 
		'jquery', 
		'underscore',
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
					<li><a href={this.props.path}>{this.props.version}</a></li>
				);
			}
		});
	}
);