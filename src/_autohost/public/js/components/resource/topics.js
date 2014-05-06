/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'jsx!resource/topic'
	], 
	function( $, _, React, Evented, Topic ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { data: {} };
			},
			render: function() {
				var self = this;
				var routes = _.map( this.props.list, function( topic, alias ) {
					return <Topic name={alias} alias={topic.topic} />;
				} );
				return (
					<div className='col-xs-6'>
						<h4>Topics</h4>
						<table className='table table-condensed table-striped table-hover'>
							<thead><tr>
								<th>Alias</th>
								<th>Topic</th>
							</tr></thead>
							<tbody>
								{routes}
							</tbody>
						</table>
					</div>
				);
			}
		});
	}
);