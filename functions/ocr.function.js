const imageUrl = args[0];
console.log(imageUrl);

const simpleEncrypt = (text, key) => {
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
        let a = text.charCodeAt(i);
        let b = key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(a ^ b);
    }
    return btoa(encrypted); // Usa btoa para codificar en base64 si estás en un entorno que lo soporta
};

const ocrRequest = Functions.makeHttpRequest({
    url: `https://vision.googleapis.com/v1/images:annotate`,
    headers: {
        'Authorization': `Bearer ${secrets.apiKey}`,
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

if (!ocrResponse.error) {
    const result = ocrResponse.data.responses[0].fullTextAnnotation?.text;
    const extractIDMEX = (text) => {
        const regex = /IDMEX[^<]*/;
        const match = text.match(regex);
        return match ? match[0] : null;
    };

    const idMex = extractIDMEX(result);
    const encryptedIDMex = simpleEncrypt(idMex, secrets.apiKey);
    console.log('Encrypted IDMEX:', encryptedIDMex);
    return Functions.encodeString(encryptedIDMex);
} else {
    return Functions.encodeString('error');
}
