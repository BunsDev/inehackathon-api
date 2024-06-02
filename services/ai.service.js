import 'dotenv/config';
import axios from 'axios';
import Jimp from 'jimp';
import {v4 as uuidv4} from 'uuid';
import mime from 'mime-types';

import OpenAI from 'openai';
import vision from '@google-cloud/vision';
import AttachmentService from '../entities/attachments/attachment.service.js';
import AWS from 'aws-sdk';
import fs from 'fs';
import {GoogleAuth} from 'google-auth-library';
import ChainLinkService from "./chainlink.service.js";

const openai = new OpenAI();

const secrets = {};

let googleVisionBeaerer = '';
//get ./functions/ocr.function.js content as source
const source = fs.readFileSync('./functions/ocr.function.js').toString();

const auth = new GoogleAuth({
    keyFilename: './.credentials/silent-wharf-177718-15d1c60f4807.json', // Asegúrate de que el path al archivo JSON es correcto
    scopes: ['https://www.googleapis.com/auth/cloud-vision'], // Cambia los scopes según la API que estés usando
});


const visionClient = new vision.ImageAnnotatorClient({
    keyFilename: '../.credentials/silent-wharf-177718-15d1c60f4807.json',
});

AWS.config.update({region: 'us-east-1'});

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
static async decryptValue(encryptedText, key) {
    console.log("Encrypted text:", encryptedText);
    let decoded;
    try {
        // Usa Buffer para decodificar desde base64 en Node.js
        decoded = Buffer.from(encryptedText, 'base64').toString('binary');
    } catch (e) {
        console.error("Error decoding base64 with Buffer:", e);
        return null;
    }

    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
        let a = decoded.charCodeAt(i);
        let b = key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(a ^ b);
    }
    return decrypted;
}



    static async ocrChainlinkAnalysis(url) {
        try {
            console.log("[Init...]")
            const client = await auth.getClient();
            googleVisionBeaerer = await client.getAccessToken();
            secrets.apiKey = googleVisionBeaerer.token;
            const fun =  await ChainLinkService.makeChainLinkRequest(
                source,
                [url],
                300_000,
                secrets,
            );
            return await AiService.decryptValue(fun, secrets.apiKey);
        } catch (error) {

        }
    }

    static async analyzeAttachment(url) {

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
                    {type: 'image_url', image_url: {url}},
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
                        },
                        required: ['documentType'],
                    },
                },
            },
        ];

        while (!toolCalls || toolCalls.length === 0) {

            try {
                if (tries > 3) break;

                const response = await openai.chat.completions.create({
                    model: 'gpt-4-turbo',
                    messages: messages,
                    tools: tools,
                    tool_choice: 'auto', // auto is default, but we'll be explicit
                });

                const responseMessage = response.choices[0].message;
                toolCalls = responseMessage.tool_calls;
            } catch (error) {
                console.log('Error analyzing attachment:', error);
            } finally {
                tries++;
            }
        }

        if (!toolCalls || toolCalls.length === 0) throw new Error('No tool calls found');

        console.log('Tool calls:', toolCalls);

        // check if we can parse the tool call
        const toolCall = JSON.parse(toolCalls[0].function?.arguments);

        // check if the tool call is valid
        if (!toolCall || !toolCall.documentType) throw new Error('Invalid tool call');

        return toolCall;
    }

    static async ocrAnalysis(url) {

        const [result] = await visionClient.textDetection(url);
        return result.fullTextAnnotation?.text;
    }

    static async getCredentialPhoto(url) {

        const [result] = await visionClient.faceDetection(url);
        const faces = result.faceAnnotations;

        if (faces.length === 0) {
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
            url: url,
            responseType: 'arraybuffer',
        });
        const imageBuffer = Buffer.from(response.data);

        // Load the image using Jimp
        const image = await Jimp.read(imageBuffer);

        // Crop the face region using Jimp
        const faceImage = image.crop(minX, minY, width, height);

        // generate a unique filename for the face
        const filename = `${uuidv4()}-face.png`;
        const path = `./uploads/${filename}`;

        // Save the face image to a file (optional)
        await faceImage.writeAsync(path);

        // upload the face image to an attachment
        return await AttachmentService.uploadLocalFile(path);
    }

    static async compareFaces(url1, url2) {

        // first we upload both images to the rekognition folder in the S3 bucket
        // get the file buffer for attachment1
        const file1 = await axios({
            url: url1,
            responseType: 'arraybuffer',
        });

        // get file name from url1
        const fileBaseName1 = url1.split('/').pop();

        let uuid = uuidv4();
        const filename1 = `${uuid}-${fileBaseName1}`;

        let s3Params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `rekognition/${filename1}`,
            Body: Buffer.from(file1.data),
            ACL: 'public-read',
            ContentType: mime.lookup(fileBaseName1),
        };

        // s3 upload with await
        await s3.upload(s3Params).promise();

        // get the file buffer for attachment2
        const file2 = await axios({
            url: url2,
            responseType: 'arraybuffer',
        });

        // get file name from url2
        const fileBaseName2 = url2.split('/').pop();

        uuid = uuidv4();
        const filename2 = `${uuid}-${fileBaseName2}`;

        s3Params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `rekognition/${filename2}`,
            Body: Buffer.from(file2.data),
            ACL: 'public-read',
            ContentType: mime.lookup(fileBaseName2),
        };

        // s3 upload with await
        await s3.upload(s3Params).promise();

        // run the rekognition compare faces function

        const params = {
            SourceImage: {
                S3Object: {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Name: `rekognition/${filename1}`,
                },
            },
            TargetImage: {
                S3Object: {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Name: `rekognition/${filename2}`,
                },
            },
            SimilarityThreshold: 85, // Adjust the similarity threshold as needed
        };

        // Call Rekognition to compare faces
        const recognition = await rekognition.compareFaces(params).promise();

        if (recognition.FaceMatches.length > 0) {
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