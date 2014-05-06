/** @jsx React.DOM */
define( [ 
		'jquery', 
		'lodash',
		'react',
		'api',
		'components/eventedComponent',
		'jsx!resource/paths',
		'jsx!resource/routes',
		'jsx!resource/topics'
	], 
	function( $, _, React, Api, Evented, Paths, Routes, Topics ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { 
					connections: {},
					resources: {} 
				};
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'resources', 'resources' );
				Api.getResources();
			},
			render: function() {
				var self = this,
					tabIndex = 0;

				var resourceList = _.map( this.state.resources, function( resource, name ) {
					var panelName = '#panel-' + name;
					var className = tabIndex ? '' : 'active';
					tabIndex ++;
					return <li className={className}><a href={panelName} data-toggle='pill'>{name}</a></li>;
				} );
				tabIndex = 0;
				var list = _.map( this.state.resources, function( resource, name ) {
					var panelName = 'panel-' + name;
					var className = tabIndex ? 'tab-pane fade in' : 'tab-pane fade in active';
					tabIndex ++;
					return 	<div className={className} id={panelName}>
								<div className='row'>
									<Routes list={ resource.routes } />
									<Topics resource={ name } list={ resource.topics } />
								</div>
								<Paths path={ resource.path } />
							</div>;
				} );
				return (
					<div>
						<div className='topnav navbar navbar-default'>
							<ul className='nav nav-pills'>
								{resourceList}
							</ul>
						</div>
						<div className='container-fluid'>
							<div className='row' >
								<div className='tab-content'>
									{list}
								</div>
							</div>
						</div>
					</div>
				);
			}
		});
	}
);