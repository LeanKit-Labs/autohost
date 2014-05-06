/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'jsx!resource/route'
	], 
	function( $, _, React, Evented, Route ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { data: {} };
			},
			render: function() {
				var routes = _.map( this.props.list, function( route, alias ) {
					return <Route url={route.url} alias={alias} verb={route.verb} />;
				} );
				return (
					<div className='col-xs-6'>
						<h4>Routes</h4>
						<table className='table table-condensed table-striped table-hover'>
							<thead><tr>
								<th>Alias</th>
								<th>Verb</th>
								<th>Path</th>
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