const imageUrl = args[0];

console.log(imageUrl);

const ocrRequest = Functions.makeHttpRequest({
	url: `https://vision.googleapis.com/v1/images:annotate`,
	headers: {
		'Authorization': `Bearer ${ secrets.apiKey }`,
		'Content-Type': 'application/json; charset=utf-8',
	},
	method: 'POST',
	data: {
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
	},
});

const ocrResponse = await ocrRequest;

console.log('OCR response ERROR:', ocrResponse.error);

if(!ocrResponse.error) {

	const result = ocrResponse.data.responses[0].fullTextAnnotation?.text;

	console.log('OCR result:', result);

	const extractIDMEX = (text) => {
		const regex = /IDMEX[^<]*/;
		const match = text.match(regex);
		return match ? match[0] : null;
	};

	const idMex = extractIDMEX(result);

	console.log('IDMEX:', idMex);

	return Functions.encodeString(idMex);
} else {
	return Functions.encodeString('error');
}