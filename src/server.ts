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

type NetworkKey = string;

const networks = new Map<NetworkKey, WebSocket[]>();
const subnetPrefix = '::ffff:';

setInterval(() => {
	console.log('!!! networks');
	console.log(JSON.stringify(mapToObject(networks)));
}, 10_000);

function mapToObject(map: Map<NetworkKey, WebSocket[]>): Record<string, string> {
	const object: Record<string, string> = {};
	for (const [k, v] of map.entries()) {
		object[k] = `Sockets ${v.length}`;
	}

	return object;
}

wss.on('connection', (ws: WebSocket, request) => {
	const networkKey = getNetworkKey(request);
	console.log('connection - networkKey: %s', networkKey);

	if (!networkKey) {
		return;
	}

	if (networks.get(networkKey) === undefined) {
		networks.set(networkKey, []);
	}

	const network = networks.get(networkKey);

	if (network) {
		network.push(ws);
		updateNetwork(network);
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
		console.log('disconnected - networkKey: %s', networkKey);

		const network = networks.get(networkKey);

		if (network) {
			network.splice(network.indexOf(ws), 1);
			updateNetwork(network);
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

function getNetworkKey(request: http.IncomingMessage): NetworkKey | undefined {
	const clientIp = requestIp.getClientIp(request);

	if (!clientIp) {
		// add logs here. Somethng is wrong
		return undefined;
	}

	const isSubnet = clientIp.startsWith(subnetPrefix);
	return isSubnet ? subnetPrefix : clientIp;
}
