import { getRouter, auth } from '@thewebchimp/primate';
const router = getRouter();

import AttachmentService from '../entities/attachments/attachment.service.js';

import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', auth, upload.single('file'), async (req, res) => {

	// Get the file from body
	const file = req.file;
	console.log(req.body);

	// Call UploadService.createAttachment with file
	const attachment = await AttachmentService.createAttachment(file);

	// Return the attachment
	res.respond({
		data: attachment,
		message: 'Attachment uploaded',
	});
});

export { router };