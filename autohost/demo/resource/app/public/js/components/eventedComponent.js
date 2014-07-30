define( [ 
		'postal'
	], 
	function( postal ) {
		return {
			onChange: function(event) {
				var id = this.props.id;
				var channel = postal.channel('control.updates');
				channel.publish( id + '.changed', { id: id, value: event.target.value });
			},
			subscribeTo: function(channel, topic, handle) {
				var channel = postal.channel(channel);
				if(!this.state.subscriptions) {
					this.state.subscriptions = {};
				}
				var actual = handle.bind(this);
				this.state.subscriptions[channel + '/' + topic] = channel.subscribe(topic, actual);
			},
			updateOn: function(channel, topic, property) {
				this.subscribeTo(channel, topic, function(data) {
					var newState = {};
					if(!property) {
						newState = data;
					} else {
						newState[property] = data.value;
					}
					this.setState(newState);
				}.bind(this));
			},
			updateOnChange: function(id, property) {
				this.updateOn('control.updates', id + '.changed', property);
			}
		};
	}
);