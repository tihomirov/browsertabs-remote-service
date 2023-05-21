// import {AddressInfo} from 'node:net';
import * as http from 'node:http';
import {AddressInfo} from 'node:net';
import * as express from 'express';
import * as WebSocket from 'ws';
import * as requestIp from 'request-ip';

const app = express();
// initialize a simple http server
const server = http.createServer(app);
// initialize the WebSocket server instance
const wss = new WebSocket.Server({server});

const networks = new Map<string, WebSocket[]>();

wss.on('connection', (ws: WebSocket, request) => {
	const clientIp = requestIp.getClientIp(request);
	console.log('clientIp: %s', clientIp);

	if (clientIp && networks.get(clientIp) === undefined) {
		networks.set(clientIp, []);
	}

	if (clientIp) {
		const network = networks.get(clientIp);

		if (network) {
			network.push(ws);
			updateNetwork(network);
		}
	}

	// connection is up, let's add a simple simple event
	ws.on('message', (message: string) => {
		// log the received message and send it back to the client
		console.log('received: %s', message);

		const broadcastRegex = /^broadcast:/;

		if (message.toString().startsWith('broadcast:')) {
			message = message.replace(broadcastRegex, '');

			// send back the message to the other clients
			for (const client of wss.clients) {
				if (client !== ws) {
					client.send(`Hello, broadcast message -> ${message}`);
				}
			}
		} else {
			ws.send(`Hello, you sent -> ${message}`);
		}
	});

	// send immediatly a feedback to the incoming connection
	ws.send('Hi there, I am a WebSocket server');

	ws.on('disconnect', () => {
		console.log(`Disconnected ${clientIp ?? 'NULL'}`);

		if (clientIp) {
			const network = networks.get(clientIp);

			if (network) {
				network.splice(network.indexOf(ws), 1);
				updateNetwork(network);
			}
		}
	});
});
// start our server
server.listen(8999, () => {
	console.log(`Server started on port ${(server.address() as AddressInfo).port} :)`);
});

function updateNetwork(network: WebSocket[]) {
	for (const socket of network) {
		socket.emit('network-clients', network.length);
	}
}
