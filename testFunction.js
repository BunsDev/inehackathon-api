import 'dotenv/config';
import ChainLinkService from './services/chainlink.service.js';

const secrets = { apiKey: process.env.QUANTUM_SECRET };
const source = `return secrets.apiKey + args[0] + args[1];`;

const fun = await ChainLinkService.makeChainlinkRequest(source, ['foo', 'bar'], 300000, secrets);

console.log(fun);