/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'components/eventedComponent',
		'jsx!resource/resources'
	], 
	function( $, _, React, Evented, Resources ) {
		return function() {
			var App = React.createClass({
				mixins: [Evented],
				getInitialState: function() {
					return { data: { } };
				},
				render: function() {
					return (
						<div>
							<header id='head'>
								<div>
									<h1>Autohost Resources</h1>
									<h4>Resources, Actions and Paths</h4>
								</div>
							</header>
							<Resources />
						</div>
					);
				}
			});
			React.renderComponent(
				<App />,
				document.getElementById('page')
			);
		};
	}
);