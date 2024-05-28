// Primate
import { PrimateController, PrimateService } from '@thewebchimp/primate';

// Services
import ElementService from '../services/element.service.js';

class ElementController extends PrimateController {

	static checkElementExists = async (req, res, next) => {
		try {
			const { name } = req.body;

			const element = await ElementService.checkElementExists(name);

			res.respond({
				data: element,
				message: 'Element exists',
			});

		} catch(e) {
			res.respond({
				result: 'error',
				status: 400,
				message: 'Error checking element exists: ' + e.message,
			});
		}
	};
}

export default ElementController;