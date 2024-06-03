import 'dotenv/config';
import { ethers } from 'ethers';
import {
	SecretsManager,
	createGist,
	deleteGist,
	ResponseListener,
	FulfillmentCode, decodeResult, ReturnType,
} from '@chainlink/functions-toolkit';
import functionsConsumerAbi from './abi/functionsClient.json' assert { type: 'json' };

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const signer = wallet.connect(provider);
const functionsRouterAddress = '0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0';

const routerAddress = '0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0';
const consumerAddress = '0x2084ee780c753e20756fb824394d4ef5d39dbcd3'; // REPLACE this with your Functions consumer address
const donId = 'fun-avalanche-fuji-1';

const secretsManager = new SecretsManager({
	signer,
	functionsRouterAddress,
	donId,
});

const explorerUrl = 'https://sepolia.etherscan.io';

await secretsManager.initialize();

const secrets = { apiKey: process.env.QUANTUM_SECRET };

const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

console.log(`Creating gist...`);
const githubApiToken = process.env.GITHUB_API_TOKEN;
if(!githubApiToken)
	throw new Error(
		'githubApiToken not provided - check your environment variables',
	);

// Create a new GitHub Gist to store the encrypted secrets
const gistURL = await createGist(
	githubApiToken,
	JSON.stringify(encryptedSecretsObj),
);
console.log(`\n✅Gist created ${ gistURL } . Encrypt the URLs..`);
const encryptedSecretsUrls = await secretsManager.encryptSecretsUrls([
	gistURL,
]);

console.log(encryptedSecretsObj);

const functionsConsumer = new ethers.Contract(
	consumerAddress,
	functionsConsumerAbi,
	signer,
);

const args = [ 'foo', 'bar' ];
const subscriptionId = 9121;
const gasLimit = 300000;

const source = `return secrets.apiKey + args[0] + args[1];`;

// Actual transaction call
const transaction = await functionsConsumer.sendRequest(
	source, // source
	encryptedSecretsUrls, // Encrypted Urls where the DON can fetch the encrypted secrets
	0, // don hosted secrets - slot ID - empty in this example
	0, // don hosted secrets - version - empty in this example
	args,
	[], // bytesArgs - arguments can be encoded off-chain to bytes.
	subscriptionId,
	gasLimit,
	ethers.utils.formatBytes32String(donId), // jobId is bytes32 representation of donId
);

// Log transaction details
console.log(`✅ Functions request sent! Transaction hash ${ transaction.hash }. Waiting for a response...`);
console.log(`See your request in the explorer ${ explorerUrl }/tx/${ transaction.hash }`);

const responseListener = new ResponseListener({
	provider: provider,
	functionsRouterAddress: routerAddress,
});

try {
	const response = await new Promise((resolve, reject) => {
		responseListener.listenForResponseFromTransaction(transaction.hash)
			.then((response) => {
				resolve(response);
			})
			.catch((error) => {
				reject(error);
			});
	});

	const fulfillmentCode = response.fulfillmentCode;

	if(fulfillmentCode === FulfillmentCode.FULFILLED) {
		console.log(`\n✅ Request ${ response.requestId } successfully fulfilled. Cost is ${ ethers.utils.formatEther(response.totalCostInJuels) } LINK. Complete response: `, response);
	} else if(fulfillmentCode === FulfillmentCode.USER_CALLBACK_ERROR) {
		console.log(`\n⚠️ Request ${ response.requestId } fulfilled. However, the consumer contract callback failed. Cost is ${ ethers.utils.formatEther(response.totalCostInJuels) } LINK. Complete response: `, response);
	} else {
		console.log(`\n❌ Request ${ response.requestId } not fulfilled. Code: ${ fulfillmentCode }. Cost is ${ ethers.utils.formatEther(response.totalCostInJuels) } LINK. Complete response: `, response);
	}

	const errorString = response.errorString;
	if(errorString) {
		console.log(`\n❌ Error during the execution: `, errorString);
	} else {
		const responseBytesHexstring = response.responseBytesHexstring;
		if(ethers.utils.arrayify(responseBytesHexstring).length > 0) {
			const decodedResponse = decodeResult(response.responseBytesHexstring, ReturnType.uint256);
			console.log(`\n✅ Decoded response to ${ ReturnType.uint256 }: `, decodedResponse);
		}
	}
} catch(error) {
	console.error('Error listening for response:', error);
}