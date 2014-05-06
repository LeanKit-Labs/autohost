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
				var result;
				if( this.props.path ) {
					result = <table className='table table-condensed table-striped table-hover'>
						<thead>
							<tr><th>URL</th><th>Directory</th></tr>
						</thead>
						<tbody>
							<tr>
								<td><b>{this.props.path.url}</b></td>
								<td><em>{this.props.path.directory}</em></td>
							</tr>
						</tbody>
					</table>;
				} else {
					result = <p>No path defined for this resource</p>;
				}
				return (
					<div className="row">
						<div className="xs-col-12">
							<h4>Path</h4>
							{ result }
						</div>
					</div>
				);
			}
		});
	}
);