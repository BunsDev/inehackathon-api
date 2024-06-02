import axios from 'axios';


const imageUrl = args[0]

const url = `https://vision.googleapis.com/v1/images:annotate`;


const ocr

const ocrAnalysis = async (imageUrl) => {
  const apiKey = 'YOUR_API_KEY';  // Sustituye esto con tu API Key
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const request = {
    requests: [
      {
        image: {
          source: {
            imageUri: imageUrl
          }
        },
        features: [
          {
            type: 'TEXT_DETECTION'
          }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(url, request);
    const result = response.data.responses[0].fullTextAnnotation?.text;
    return result || 'No text detected';
  } catch (error) {
    console.error('Error during the OCR process:', error);
    throw error;
  }
};

export default ocrAnalysis;
