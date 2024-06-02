import axios from 'axios';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

AWS.config.update({ region: 'us-east-1' });
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS,
});

const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();

const compareFaces = async (url1, url2) => {
  const uploadToS3 = async (url, folder) => {
    const file = await axios({
      url: url,
      responseType: 'arraybuffer',
    });

    const fileBaseName = url.split('/').pop();
    const filename = `${uuidv4()}-${fileBaseName}`;
    const s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${folder}/${filename}`,
      Body: Buffer.from(file.data),
      ACL: 'public-read',
      ContentType: mime.lookup(fileBaseName),
    };

    await s3.upload(s3Params).promise();
    return filename;
  };

  const filename1 = await uploadToS3(url1, 'rekognition');
  const filename2 = await uploadToS3(url2, 'rekognition');

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
    SimilarityThreshold: 85,
  };

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
};

export default compareFaces;
