import { getRouter, auth, setupRoute } from '@thewebchimp/primate';
import AttachmentController from './attachment.controller.js';
const router = getRouter();

const options = {};

// Functions -----------------------------------------------------------------------------------------------------------

// register
router.get('/:id', AttachmentController.viewAttachment);

// analyze
router.post('/:id/analyze', auth, AttachmentController.analyzeAttachment);

// get the credential photo
router.post('/credential-photo', auth, AttachmentController.getCredentialPhoto);

// compare faces
router.post('/compare-faces', auth, AttachmentController.compareFaces);

// ---------------------------------------------------------------------------------------------------------------------

setupRoute('attachment', router, options);

export { router };