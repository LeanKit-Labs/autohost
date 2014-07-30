/** @jsx React.DOM */
define( [ 
		'jquery', 
		'underscore',
		'react',
		'api',
		'components/eventedComponent',
		'jsx!components/download'
	], 
	function( $, _, React, Api, Evented, Download ) {
		return React.createClass({
			mixins: [Evented],
			getInitialState: function() {
				return { downloads: {} };
			},
			componentWillMount: function() {
				this.updateOn( 'api', 'downloads', 'downloads' );
				Api.getDownloads();
			},
			render: function() {
				var width = (12 / _.keys( this.state.downloads ).length );
				var widthClass = 'panel columns large-' + width + ' medium-' + width + ' small-' + width;
				var list = _.map( this.state.downloads, function( list, plat ) {
					var items = _.map( list, function( item ) {
						return <Download version={item.version} path={item.path} />;
					} ); 
					return 	<div className={widthClass}>
								<h4>{plat}</h4>
								<ul className='no-bullet'>
									{items}
								</ul>
							</div>;
				} );
				return (
					<div className='row'>
						<h2 classname='large-12'>Downloads</h2>
						<div className='large-12 columns'>
							{list}
						</div>
					</div>
				);
			}
		});
	}
);