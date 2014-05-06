define( [
			'jquery',
			'lodash'
		], 
function( $, _ ) {
	return {
		conditionallyEnable: function( selector, predicate ) {
			if( predicate() ) {
				enable( selector );
			} else {
				disable( selector );
			}
		},
		disable: function( filter ) {
			$( filter ).attr( 'disabled', 'disabled' );
		},
		enable: function( filter ) {
			$( filter ).removeAttr( 'disabled' );
		},
		uncheck: function( filter ) {
			_.each( $( filter ), function( cb ) {
				cb.checked = false;
			} );
		}
	};
} );