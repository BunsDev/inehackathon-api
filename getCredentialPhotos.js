import axios from 'axios';
import Jimp from 'jimp';
import { v4 as uuidv4 } from 'uuid';
import AttachmentService from '../entities/attachments/attachment.service.js';
import vision from '@google-cloud/vision';

const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: '.credentials/silent-wharf-177718-15d1c60f4807.json',
});

const getCredentialPhoto = async (url) => {
  const [result] = await visionClient.faceDetection(url);
  const faces = result.faceAnnotations;

  if (faces.length === 0) {
    throw new Error('No faces detected.');
  }

  const boundingPoly = faces[0].boundingPoly.vertices;
  const xCoords = boundingPoly.map(vertex => vertex.x);
  const yCoords = boundingPoly.map(vertex => vertex.y);
  const minX = Math.min(...xCoords);
  const minY = Math.min(...yCoords);
  const maxX = Math.max(...xCoords);
  const maxY = Math.max(...yCoords);
  const width = maxX - minX;
  const height = maxY - minY;

  const response = await axios({
    url: url,
    responseType: 'arraybuffer',
  });
  const imageBuffer = Buffer.from(response.data);

  const image = await Jimp.read(imageBuffer);
  const faceImage = image.crop(minX, minY, width, height);

  const filename = `${uuidv4()}-face.png`;
  const path = `./uploads/${filename}`;

  await faceImage.writeAsync(path);
  return await AttachmentService.uploadLocalFile(path);
};

export default getCredentialPhoto;
