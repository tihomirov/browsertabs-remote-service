// import {AddressInfo} from 'node:net';
import * as express from 'express';
import * as requestIp from 'request-ip';
import {Server, Socket} from 'socket.io';

// const app = express();
// const server = app.listen(8080, () => {
// 	console.log(`listening on port ${(server.address() as AddressInfo).port}`);
// });

const io = new Server(3000, { /* options */ });

const networks = new Map<string, Socket[]>();

io.on('connection', socket => {
	const clientIp = requestIp.getClientIp(socket.request);
	console.log(`New connection from ${clientIp ?? 'NULL'}`);

	if (clientIp && networks.get(clientIp) === undefined) {
		networks.set(clientIp, []);
	}

	if (clientIp) {
		const network = networks.get(clientIp);

		if (network) {
			network.push(socket);
			updateNetwork(network);
		}
	}

	socket.on('disconnect', () => {
		console.log(`Disconnected ${clientIp ?? 'NULL'}`);

		if (clientIp) {
			const network = networks.get(clientIp);

			if (network) {
				network.splice(network.indexOf(socket), 1);
				updateNetwork(network);
			}
		}
	});
});

function updateNetwork(network: Socket[]) {
	for (const socket of network) {
		socket.emit('network-clients', network.length);
	}
}

