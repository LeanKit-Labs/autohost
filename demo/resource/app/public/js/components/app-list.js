/** @jsx React.DOM */
define( [ 
		'jquery', 
		'underscore',
		'react',
		'components/eventedComponent',
		'jsx!components/downloads'
	], 
	function( $, _, React, Evented, Downloads ) {
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
									<h1>On-premise Integration Service Downloads</h1>
									<h4>Requires a LeanKit issued API Key and Credentials</h4>
								</div>
							</header>
							<Downloads />
						</div>
					);
				}
			});
			React.renderComponent(
				<App />,
				document.getElementById('listing')
			);
		};
	}
);