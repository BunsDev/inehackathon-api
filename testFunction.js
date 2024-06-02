import 'dotenv/config';
import ChainLinkService from './services/chainlink.service.js';

const secrets = { apiKey: process.env.QUANTUM_SECRET };
const source = `return Functions.encodeString(secrets.apiKey + args[0] + args[1]);`;

const fun = await ChainLinkService.makeChainLinkRequest(source, ['foo', 'bar'], 300_000, secrets);

console.log(fun);
