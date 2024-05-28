import 'dotenv/config';
import axios from 'axios';
import Jimp from 'jimp';
import { v4 as uuidv4 } from 'uuid';

import OpenAI from 'openai';
import vision from '@google-cloud/vision';
import AttachmentService from '../entities/attachments/attachment.service.js';
import AWS from 'aws-sdk';
const openai = new OpenAI();

const visionClient = new vision.ImageAnnotatorClient({
	keyFilename: '.credentials/silent-wharf-177718-15d1c60f4807.json',
});

AWS.config.update({ region: 'us-east-1' });

// Set the credentials
AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS,
});

const s3 = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS,
});

const rekognition = new AWS.Rekognition();

class AiService {

	static async analyzeAttachment(attachment) {

		// get attachment url
		const url = AttachmentService.getUrl(attachment);

		let toolCalls = null;
		let tries = 0;

		const messages = [
			{
				role: 'system',
				content: [
					{
						type: 'text',
						text: `Please analyze the document type of the following file. Consider only the following types:
						- INE (Mexican National ID) - Front - Identifier: ine_front
						- INE (Mexican National ID) - Back - Identifier: ine_back
						- Proof of Address - CFE (Mexican Electric Bill) - Identifier: cfe
						- Proof of Address - Telmex (Mexican Phone Bill) - Identifier: telmex
						- Proof of Address - Izzi (Mexican Phone Bill) - Identifier: izzi
						- Proof of Address - Water Bill - Identifier: water
						- Proof of Address - Water Bill SAPASA - Identifier: sapasa
						- Proof of Address - Gas Bill - Identifier: gas
						- Bank Statement - Identifier: bank_statement
						- Birth Certificate - Identifier: birth_certificate
						- Marriage Certificate - Identifier: marriage_certificate
						- CURP (Mexican National ID) - Identifier: curp
						- Passport - Identifier: passport
						
						Return only the identifier of the document type.
						Consider that the image may contain more than one document type, in that case separate the identifiers with a comma.`,
					},
				],
			},
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'What type of document is this one?',
					},
					{ type: 'image_url', image_url: { url } },
				],
			},
		];

		const tools = [
			{
				type: 'function',
				function: {
					name: 'callDocumentTypeAnalysis',
					description: 'Call the document type analysis function',
					parameters: {
						type: 'object',
						properties: {
							documentType: {
								type: 'string',
								description: 'The document type identifier, comma separated if more than one',
							},
							reasoning: {
								type: 'string',
								description: 'The reasoning behind the document type identification, in spanish',
							},
						},
						required: [ 'documentType' ],
					},
				},
			},
		];

		while(!toolCalls || toolCalls.length === 0) {

			try {
				if(tries > 3) break;

				const response = await openai.chat.completions.create({
					model: 'gpt-4-turbo',
					messages: messages,
					tools: tools,
					tool_choice: 'auto', // auto is default, but we'll be explicit
				});

				const responseMessage = response.choices[0].message;
				toolCalls = responseMessage.tool_calls;
			} catch(error) {
				console.log('Error analyzing attachment:', error);
			} finally {
				tries++;
			}
		}

		if(!toolCalls || toolCalls.length === 0) throw new Error('No tool calls found');

		console.log('Tool calls:', toolCalls);

		// check if we can parse the tool call
		const toolCall = JSON.parse(toolCalls[0].function?.arguments);

		// check if the tool call is valid
		if(!toolCall || !toolCall.documentType) throw new Error('Invalid tool call');

		return toolCall;
	}

	static async ocrAnalysis(attachment) {

		// get attachment url
		const url = AttachmentService.getUrl(attachment);
		const [ result ] = await visionClient.textDetection(attachment.metas.location);

		return result.fullTextAnnotation?.text;
	}

	static async getCredentialPhoto(attachment) {

		// if attachment is a number, it's an id, so we need to get the attachment
		if(typeof attachment === 'number') {
			attachment = await AttachmentService.get(attachment);
		}

		const [ result ] = await visionClient.faceDetection(attachment.metas.location);
		const faces = result.faceAnnotations;

		if(faces.length === 0) {
			throw new Error('No faces detected.');
		}

		// Get the bounding polygon of the first detected face
		const boundingPoly = faces[0].boundingPoly.vertices;

		// Calculate the bounding box from the bounding polygon
		const xCoords = boundingPoly.map(vertex => vertex.x);
		const yCoords = boundingPoly.map(vertex => vertex.y);
		const minX = Math.min(...xCoords);
		const minY = Math.min(...yCoords);
		const maxX = Math.max(...xCoords);
		const maxY = Math.max(...yCoords);
		const width = maxX - minX;
		const height = maxY - minY;

		// Download the image
		const response = await axios({
			url: attachment.metas.location,
			responseType: 'arraybuffer',
		});
		const imageBuffer = Buffer.from(response.data);

		// Load the image using Jimp
		const image = await Jimp.read(imageBuffer);

		// Crop the face region using Jimp
		const faceImage = image.crop(minX, minY, width, height);

		// Save the face image to a file (optional)
		await faceImage.writeAsync('./uploads/face.png');

		// upload the face image to an attachment
		return await AttachmentService.createAttachmentFromLocalFile('./uploads/face.png');
	}

	static async compareFaces(attachment1, attachment2) {

		// if attachment1 is number, it's an id, so we need to get the attachment
		if(typeof attachment1 === 'number') {
			attachment1 = await AttachmentService.get(attachment1);
		}

		// if attachment2 is number, it's an id, so we need to get the attachment
		if(typeof attachment2 === 'number') {
			attachment2 = await AttachmentService.get(attachment2);
		}

		// first we upload both images to the rekognition folder in the S3 bucket
		// get the file buffer for attachment1
		const file1 = await axios({
			url: attachment1.metas.location,
			responseType: 'arraybuffer',
		});

		let uuid = uuidv4();
		const filename1 = `${ uuid }-${ attachment1.name }`;

		let s3Params = {
			Bucket: process.env.AWS_BUCKET_NAME,
			Key: `rekognition/${ filename1 }`,
			Body: Buffer.from(file1.data),
			ACL: 'public-read',
			ContentType: attachment1.mime,
		};

		// s3 upload with await
		await s3.upload(s3Params).promise();

		// get the file buffer for attachment2
		const file2 = await axios({
			url: attachment2.metas.location,
			responseType: 'arraybuffer',
		});

		uuid = uuidv4();
		const filename2 = `${ uuid }-${ attachment2.name }`;

		s3Params = {
			Bucket: process.env.AWS_BUCKET_NAME,
			Key: `rekognition/${ filename2 }`,
			Body: Buffer.from(file2.data),
			ACL: 'public-read',
			ContentType: attachment2.mime,
		};

		// s3 upload with await
		await s3.upload(s3Params).promise();

		// run the rekognition compare faces function

		const params = {
			SourceImage: {
				S3Object: {
					Bucket: process.env.AWS_BUCKET_NAME,
					Name: `rekognition/${ filename1 }`,
				},
			},
			TargetImage: {
				S3Object: {
					Bucket: process.env.AWS_BUCKET_NAME,
					Name: `rekognition/${ filename2 }`,
				},
			},
			SimilarityThreshold: 80, // Adjust the similarity threshold as needed
		};

		// Call Rekognition to compare faces
		const recognition = await rekognition.compareFaces(params).promise();

		if(recognition.FaceMatches.length > 0) {
			return {
				matched: true,
				similarity: recognition.FaceMatches[0].Similarity,
			};
		} else {
			return {
				matched: false,
				similarity: 0,
			};
		}

	}
}

export default AiService;