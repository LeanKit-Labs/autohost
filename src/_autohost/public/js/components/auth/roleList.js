/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'components/eventedComponent'
	], 
	function( $, _, React, Api, Evented ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { roles: {} };
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'role.list', 'roles' );
				Api.getRoles();
			},
			render: function() {
				var self = this;
				var roles = _.map( this.state.roles, function( role ) {
					return <li>{role}</li>;
				} );
				return (
					<div>
						<h4>Roles</h4>
						<ul className="indented-list">
							{roles}
						</ul>
					</div>
				);
			}
		});
	}
);