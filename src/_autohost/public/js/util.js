define( [
			'jquery',
			'lodash'
		], 
function( $, _ ) {
	return {
		conditionallyEnable: function( selector, predicate ) {
			if( predicate() ) {
				this.enable( selector );
			} else {
				this.disable( selector );
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