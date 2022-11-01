require('../setup');
var postal = require('postal');
var eventChannel = postal.channel('events');
var port = 8988;
var config = {
	port: port,
	socketio: true,
	websocket: true,
	defaultUser: true,
	handleRouteErrors: true
};
var harnessFn = require('../../src/harness');

describe('Socket Management', function () {
	var harness;

	before(function () {
		harness = harnessFn(config);
		harness.addUser('usertwo', 'two', 'two', []);
		harness.start();
	});

	describe('with multiple socket clients', function () {
		var io, ws, ioC, wsC;
		var clients = [];
		var connectionSubscription;
		var closedSubscription;
		before(function (done) {
			function check() {
				if (ioC && wsC) {
					done();
				}
			}

			connectionSubscription = eventChannel.subscribe('socket.client.connected', function (client) {
				clients.push(client);
			});

			closedSubscription = eventChannel.subscribe('socket.client.closed', function (data) {
				_.remove(clients, { socket: data.socket });
			});

			io = harness.getIOClient('http://localhost:8988', { query: 'token=one', reconnection: false });
			io.once('connect', function () {
				ioC = true;
				check();
			});

			ws = harness.getWSClient('http://localhost:8988/websocket', { Authorization: 'Bearer two' });
			ws.once('connect', function (c) {
				wsC = c;
				check();
			});
		});

		it('should uniquely id clients', function () {
			var client1Id = clients[0].socket.connectionId;
			var client2Id = clients[1].socket.connectionId;

			expect(client1Id).to.exist;
			expect(client2Id).to.exist;
			client1Id.should.not.equal(client2Id);
		});

		describe('when notifying clients', function () {
			var ioMessages = [];
			var wsMessages = [];
			var onWSMessage;

			before(function (done) {
				function check() {
					if (ioMessages.length && wsMessages.length) {
						done();
					}
				}

				onWSMessage = function (msg) {
					var json = JSON.parse(msg.utf8Data);
					if (json.topic === 'broadcast') {
						wsMessages.push(json.data);
						check();
					}
				};

				wsC.on('message', onWSMessage);

				io.once('broadcast', function (msg) {
					ioMessages.push(msg);
					check();
				});

				harness.socket.notify('broadcast', { message: 'behold, an broadcast!' });
			});

			it('should send messages to all connected clients', function () {
				ioMessages.should.eql([{ message: 'behold, an broadcast!' }]);
				wsMessages.should.eql([{ message: 'behold, an broadcast!' }]);
			});
		});

		describe('when sending to a specific client', function () {
			var ioMessages = [];
			var wsMessages = [];
			var onWSMessage;

			before(function (done) {
				function check() {
					if (ioMessages.length && wsMessages.length) {
						done();
					}
				}

				onWSMessage = function (msg) {
					var json = JSON.parse(msg.utf8Data);
					if (json.topic === 'specific') {
						wsMessages.push(json.data);
						check();
					}
				};

				wsC.on('message', onWSMessage);

				io.once('specific', function (msg) {
					ioMessages.push(msg);
					check();
				});

				harness.socket.send('userone', 'specific', { message: 'sent to userone' });
				harness.socket.send('usertwo', 'specific', { message: 'sent to usertwo' });
			});

			it('should send messages to all connected clients', function () {
				ioMessages.should.eql([{ message: 'sent to userone' }]);
				wsMessages.should.eql([
					{ message: 'sent to usertwo' }
				]);
			});
		});

		describe('when closing a specific client', function () {
			var firstSocket, secondSocket;

			before(function () {
				firstSocket = clients[0].socket;
				secondSocket = clients[1].socket;

				secondSocket.close();
			});

			it('should remove just the given client', function () {
				clients.should.eql([{ socket: firstSocket }]);
			});

			it('should remove the closed client from its lookup', function () {
				Object.keys(harness.socket.clients.lookup).should.eql([firstSocket.user.name]);
			});
		});

		after(function () {
			connectionSubscription.unsubscribe();
			closedSubscription.unsubscribe();
		});
	});

	after(function () {
		harness.stop();
	});
});
