const url1 = args[0];
const url2 = args[1];


const ocrRequest = Functions.makeHttpRequest({
	url: `https://ine-api.qcdr.io/attachments/compare-faces`,
	headers: {
		'Content-Type': 'application/json; charset=utf-8',
	},
	method: 'POST',
	data: {
		url1,
		url2,
	},
});

const ocrResponse = await ocrRequest;

if(!ocrResponse.error) {

	console.log(JSON.stringify(ocrResponse));

	return Functions.encodeString(ocrResponse.data.data.matched + ',' + ocrResponse.data.data.similarity);
} else {
	return Functions.encodeString('error');
}