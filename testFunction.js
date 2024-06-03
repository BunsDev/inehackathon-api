import 'dotenv/config';
import ChainLinkService from './services/chainlink.service.js';
import AiService from "./services/ai.service.js";
/*
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

const secrets = {};

let googleVisionBeaerer = '';

//const source = `return Functions.encodeString(secrets.apiKey + args[0] + args[1]);`;

//get ./functions/ocr.function.js content as source
const source = fs.readFileSync('./functions/ocr.function.js').toString();

const auth = new GoogleAuth({
	keyFilename: './.credentials/silent-wharf-177718-15d1c60f4807.json', // Asegúrate de que el path al archivo JSON es correcto
	scopes: [ 'https://www.googleapis.com/auth/cloud-vision' ], // Cambia los scopes según la API que estés usando
});

try {
	const client = await auth.getClient();
	googleVisionBeaerer = await client.getAccessToken();
} catch(error) {
	console.error('Error obtaining access token:', error);
}

console.log('Google Vision Bearer:', googleVisionBeaerer.token);

secrets.apiKey = googleVisionBeaerer.token;

console.log('Secrets:', secrets);

const fun = await ChainLinkService.makeChainLinkRequest(
	source,
	[ 'https://ag1.sfo3.digitaloceanspaces.com/upload/2024/06/62c6ab5f-b265-4c55-b2b6-d11011781c10-ine-rodrigo-tras.jpeg' ],
	300_000,
	secrets
);


const unencrypt = await AiService.decryptValue(fun, secrets.apiKey);
console.log("[IDMEX IS: ]", unencrypt);
console.log(fun);
*/


//const res = await AiService.ocrChainlinkAnalysis('https://ag1.sfo3.digitaloceanspaces.com/upload/2024/06/62c6ab5f-b265-4c55-b2b6-d11011781c10-ine-rodrigo-tras.jpeg');

const res = await AiService.recognitionChainlinkAnalysis(
	'https://ag1.sfo3.digitaloceanspaces.com/upload/2024/06/1e8285ea-8460-4ee9-b3d4-7125c7917ece-ine-bjtm.png',
	'https://ag1.sfo3.digitaloceanspaces.com/upload/2024/06/3479c558-dec3-4f56-bccb-d57b232904c6-selfie-bernie.jpg'
);
console.log("EL RESULTADO ES: ", res);