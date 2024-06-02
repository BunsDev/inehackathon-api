const imageUrl = args[0];

const ocrRequest = Functions.makeHttpRequest({
	url: `https://vision.googleapis.com/v1/images:annotate`,
	// Get a free API key from https://coinmarketcap.com/api/
	headers: {
		'x-goog-user-project': secrets.projectId,
		'Authorization': `Bearer ${ secrets.apiKey }`,
		'Content-Type': 'application/json; charset=utf-8',
		'X-CMC_PRO_API_KEY': secrets.apiKey,
	},
	method: 'POST',
	body: {
		requests: [
			{
				image: {
					source: {
						imageUri: imageUrl,
					},
				},
				features: [
					{
						type: 'TEXT_DETECTION',
					},
				],
			},
		],
	}
});

const ocrResponse = await ocrRequest;

if(ocrResponse.error) {
	throw new Error(`Error during the OCR process: ${ ocrResponse.data.error.message }`);
}

const result = ocrResponse.data.responses[0].fullTextAnnotation?.text;

const extractIDMEX = (text) => {
	const regex = /IDMEX[^<]*/;
	const match = text.match(regex);
	return match ? match[0] : null;
};

const idMex = extractIDMEX(result);

return Functions.encodeUint256(idMex);