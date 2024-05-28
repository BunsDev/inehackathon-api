import { getRouter, auth, setupRoute } from '@thewebchimp/primate';
import ElementController from './element.controller.js';
const router = getRouter();

const options = {
	searchField: [ 'slug' ],
	queryableFields: [ 'slug' ],
};

// Functions -----------------------------------------------------------------------------------------------------------

// check element exists
router.post('/exists', ElementController.checkElementExists);

// ---------------------------------------------------------------------------------------------------------------------

setupRoute('element', router, options);

export { router };