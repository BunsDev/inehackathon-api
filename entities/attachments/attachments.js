import { getRouter, auth, setupRoute } from '@thewebchimp/primate';
import AttachmentController from './attachment.controller.js';
const router = getRouter();

const options = {};

// Functions -----------------------------------------------------------------------------------------------------------

// analyze
router.post('/analyze', AttachmentController.analyzeAttachment);

// get the credential photo
router.post('/credential-photo', AttachmentController.getCredentialPhoto);

// compare faces
router.post('/compare-faces', AttachmentController.compareFaces);

// ocr
router.post('/ocr', AttachmentController.ocrAttachment);

// ---------------------------------------------------------------------------------------------------------------------

setupRoute('attachment', router, options);

export { router };