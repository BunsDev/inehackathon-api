import 'dotenv/config';
import {
	SubscriptionManager,
	simulateScript,
	SecretsManager,
	ResponseListener,
	createGist,
	deleteGist,
	ReturnType,
	decodeResult,
	FulfillmentCode,
} from '@chainlink/functions-toolkit';
import { ethers } from 'ethers';
import functionsConsumerAbi from '../abi/functionsClient.json' assert { type: 'json' };

const consumerAddress = '0x2084ee780c753e20756fb824394d4ef5d39dbcd3'; // REPLACE this with your Functions consumer address
const subscriptionId = 9121; // REPLACE this with your subscription ID

const ENV_VARS = {
	PRIVATE_KEY: process.env.PRIVATE_KEY,
	RPC_URL: process.env.RPC_URL,
};

console.log(ENV_VARS);

class ChainLinkService {
	static async makeChainLinkRequest(stringJavascriptCode, args, gasLimit, secrets) {
		const routerAddress = '0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0';
		const linkTokenAddress = '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846';
		const donId = 'fun-avalanche-fuji-1';
		const explorerUrl = 'https://testnet.snowtrace.io';
		const source = stringJavascriptCode;

		if(!ENV_VARS.PRIVATE_KEY) {
			throw new Error('Private key not provided - check your environment variables');
		}

		if(!ENV_VARS.RPC_URL) {
			throw new Error('RPC URL not provided - check your environment variables');
		}

		const provider = new ethers.providers.JsonRpcProvider(ENV_VARS.RPC_URL);
		const wallet = new ethers.Wallet(ENV_VARS.PRIVATE_KEY);
		const signer = wallet.connect(provider);

		/*console.log('Start simulation...');

		const response = await simulateScript({
			source: source,
			args: args,
			bytesArgs: [],
			secrets: secrets,
		});

		console.log('Simulation result', response);
		const errorString = response.errorString;
		if(errorString) {
			console.log(`❌ Error during simulation: `, errorString);
		} else {
			const returnType = ReturnType.uint256;
			const responseBytesHexstring = response.responseBytesHexstring;
			if(ethers.utils.arrayify(responseBytesHexstring).length > 0) {
				const decodedResponse = decodeResult(response.responseBytesHexstring, returnType);
				console.log(`✅ Decoded response to ${ returnType }: `, decodedResponse);
			}
		}*/

		console.log('\nEstimate request costs...');

		const subscriptionManager = new SubscriptionManager({
			signer: signer,
			linkTokenAddress: linkTokenAddress,
			functionsRouterAddress: routerAddress,
		});
		await subscriptionManager.initialize();

		const subManager = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress: routerAddress });
		await subManager.initialize();

		// Validate the consumer contract has been authorized to use the subscription
		const subInfo = await subManager.getSubscriptionInfo(subscriptionId);
		if(!subInfo.consumers.map((c) => c.toLowerCase()).includes(consumerAddress.toLowerCase())) {
			throw Error(`Consumer contract ${ consumerAddress } has not been added to subscription ${ subscriptionId }`);
		}

		const gasPriceWei = await signer.getGasPrice();

		const estimatedCostInJuels = await subscriptionManager.estimateFunctionsRequestCost({
			donId: donId,
			subscriptionId: subscriptionId,
			callbackGasLimit: gasLimit,
			gasPriceWei: BigInt(gasPriceWei),
		});

		console.log(`Fulfillment cost estimated to ${ ethers.utils.formatEther(estimatedCostInJuels) } LINK`);

		console.log('\nMake request...');

		const secretsManager = new SecretsManager({
			signer,
			functionsRouterAddress: routerAddress,
			donId,
		});

		await secretsManager.initialize();

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
		console.log(`\n✅  Gist created ${ gistURL } . Encrypt the URLs...`);
		const encryptedSecretsUrls = await secretsManager.encryptSecretsUrls([
			gistURL,
		]);

		const overrides = {
			gasLimit: gasLimit,
		};

		console.log(encryptedSecretsObj);

		const functionsConsumer = new ethers.Contract(consumerAddress, functionsConsumerAbi, signer);

		const transaction = await functionsConsumer.sendRequest(
			source,
			1,
			encryptedSecretsUrls,
			args,
			[],
			subscriptionId,
			gasLimit,
		);

		console.log(`\n✅  Functions request sent! Transaction hash ${ transaction.hash }. Waiting for a response...`);
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

					// decodedResponse as string
					const decodedResponseString = decodeResult(response.responseBytesHexstring, ReturnType.string);
					console.log(`\n✅ Decoded response to ${ ReturnType.string }: `, decodedResponseString);
				}
			}
		} catch(error) {
			console.error('Error listening for response:', error);
		} finally {
			// delete the gist
			await deleteGist(githubApiToken, gistURL);
		}
	}
}

export default ChainLinkService;
