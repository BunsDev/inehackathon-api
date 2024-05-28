import { prisma } from '@thewebchimp/primate';
import AWS from 'aws-sdk';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import fs from 'fs';

const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT);
const s3 = new AWS.S3({
	endpoint: spacesEndpoint,
	accessKeyId: process.env.SPACES_KEY,
	secretAccessKey: process.env.SPACES_SECRET,
});

class AttachmentService {

	static findById(id) {
		try {
			return prisma.attachment.findUnique({
				where: { id: parseInt(id) },
			});
		} catch(e) {
			throw e;
		}
	}

	static get(id) {
		try {
			return prisma.attachment.findUnique({
				where: { id },
			});
		} catch(e) {
			throw e;
		}
	}

	static getUrl(attachment) {

		let url;

		if(attachment.acl === 'public-read') {

			url = attachment.metas.location;

		} else {

			url = s3.getSignedUrl('getObject', {
				Bucket: process.env.SPACES_BUCKET_NAME,
				Key: attachment.attachment,
				Expires: 60 * 60 * 24 * 7, // 7 days
			});
		}

		return url;
	}

	static async createAttachmentFromLocalFile(file, params = {}) {
		try {

			// get the name from the file path
			const name = file.split('/').pop();

			// get the size of the file
			const stats = fs.statSync(file);

			const fileObj = {
				mimetype: mime.lookup(file),
				originalname: name,
				size: stats.size,
				buffer: fs.readFileSync(file),
			};

			return AttachmentService.createAttachment(fileObj, params);

		} catch(error) {
			throw error;
		}
	}

	static async createAttachment(file, params = {}) {
		try {

			// get the mime type of file
			const mimeType = file.mimetype;
			const acl = params.acl || 'public-read';

			// The file should go to /upload/[year]/[month]/[filename]
			const date = new Date();
			const year = date.getFullYear();
			let month = date.getMonth() + 1;

			// add padded zero to month
			if(month < 10) month = '0' + month;

			// append uuid to file original name
			const uuid = uuidv4();
			let filename = `${ uuid }-${ file.originalname }`;

			// slugify filename
			filename = slugify(filename, { lower: true });

			const fileBuffer = file.buffer;

			const s3Params = {
				Bucket: process.env.SPACES_BUCKET_NAME,
				Key: `upload/${ year }/${ month }/${ filename }`,
				Body: file.buffer,
				ACL: acl,
				ContentType: mimeType,
			};

			// s3 upload with await
			const data = await s3.upload(s3Params).promise();

			// Create attachment in database
			const attachment = await prisma.attachment.create({
				data: {
					name: file.originalname,
					slug: filename,
					attachment: `upload/${ year }/${ month }/${ filename }`,
					mime: mimeType,
					size: file.size,
					source: 'digitalocean',
					acl: acl,
					metas: {
						location: data.Location,
					},
				},
			});

			return {
				attachment,
				data,
			};

		} catch(error) {
			throw error;
		}
	}

	static async viewFile(id) {
		try {
			const attachment = await prisma.attachment.findUnique({
				where: { id: parseInt(id) },
			});

			// get attachment location
			return AttachmentService.getUrl(attachment);

		} catch(e) {
			throw e;
		}
	}
}

export default AttachmentService;