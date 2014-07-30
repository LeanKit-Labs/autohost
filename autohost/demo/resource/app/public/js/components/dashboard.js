/** @jsx React.DOM */
define( [ 
		'jquery', 
		'underscore',
		'react',
		'components/eventedComponent'
	], 
	function( $, _, React, Evented ) {
		return function() {
			var App = React.createClass({
				mixins: [Evented],
				getInitialState: function() {
					return { data: { } };
				},
				render: function() {
					return (
						<div>
							<header>
								<div>
									<h1>On-premise Integration Service Dashboard</h1>
									<h4>Information and Statistics</h4>
								</div>
							</header>
						</div>
					);
				}
			});
			React.renderComponent(
				<App />,
				document.getElementById('main')
			);
		};
	}
);