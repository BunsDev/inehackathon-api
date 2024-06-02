import AttachmentService from './attachment.service.js';
import AiService from '../../services/ai.service.js';

class AttachmentController {

	/**
	 * Views an attachment by redirecting to its URL.
	 *
	 * @param {object} req - The request object containing the attachment ID.
	 * @param {object} res - The response object for sending the results.
	 * @returns {void}
	 * @throws {Error} - Throws an error if parameters are invalid or if there is a service error.
	 */
	static async viewAttachment(req, res) {
		try {
			const { id } = req.params;

			// Validate input parameter
			if(!id) {
				return res.respond({
					status: 400,
					message: 'Attachment ID is required.',
				});
			}

			// Fetch the URL of the attachment by ID
			const url = await AttachmentService.viewFile(id);

			// Validate output from AttachmentService
			if(!url) {
				return res.respond({
					status: 404,
					message: 'Attachment not found.',
				});
			}

			// Redirect to the URL
			res.redirect(url);

		} catch(error) {
			// Handle errors and send appropriate response
			console.error('Error viewing attachment:', error);
			res.respond({
				status: 500,
				message: 'Error viewing attachment: ' + error.message,
			});
		}
	}

	/**
	 * Analyzes an attachment using AI services.
	 *
	 * @param {object} req - The request object containing the attachment ID.
	 * @param {object} res - The response object for sending the results.
	 * @returns {void}
	 * @throws {Error} - Throws an error if parameters are invalid or if there is a service error.
	 */
	static async analyzeAttachment(req, res) {
		try {
			const { url } = req.body;

			// Validate input parameter
			if(!url) {
				return res.respond({
					status: 400,
					message: 'Attachment URL is required.',
				});
			}

			// Analyze the attachment using AI service
			const analysis = await AiService.analyzeAttachment(url);

			// Validate output from AiService
			if(!analysis) {
				res.respond({
					status: 500,
					message: 'Error analyzing attachment.',
				});
			}

			// Respond with the analysis result
			res.respond({
				status: 200,
				data: analysis,
			});

		} catch(error) {
			// Handle errors and send appropriate response
			console.error('Error analyzing attachment:', error);
			res.respond({
				status: 500,
				message: 'Error analyzing attachment: ' + error.message,
			});
		}
	}

	static async ocrAttachment(req, res) {
		try {
			const { url } = req.body;

			if(!url) {
				res.respond({
					status: 400,
					message: 'Attachment URL is required.',
				});
			}

			// const ocrText = await AiService.ocrAnalysis(url);
			const { data, tx } = await AiService.ocrChainlinkAnalysis(url);
			res.respond({
				status: 200,
				data: {
					idMex: data,
					tx
				}
			});

		} catch(error) {
			res.respond({
				status: 400,
				message: 'Error analyzing attachment: ' + error.message,
			});
		}
	}

	static async getCredentialPhoto(req, res) {
		try {

			// check if we receive id
			const { url } = req.body;

			console.log();

			const photo = await AiService.getCredentialPhoto(url);
			res.respond({
				status: 200,
				data: photo,
			});

		} catch(error) {
			res.respond({
				status: 400,
				message: 'Error creating credential photo: ' + error.message,
			});
		}
	}

	static async compareFaces(req, res) {
		try {
			const { url1, url2 } = req.body;

			const recognition = await AiService.compareFaces(url1, url2);

			res.respond({
				status: 200,
				data: recognition,
			});

		} catch(error) {
			res.respond({
				status: 400,
				message: 'Error comparing faces: ' + error.message,
			});
		}
	}
}

export default AttachmentController;