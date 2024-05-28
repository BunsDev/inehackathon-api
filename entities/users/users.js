import { getRouter, auth, setupRoute } from '@thewebchimp/primate';
import UserController from './user.controller.js';
const router = getRouter();

const options = {
	searchField: [ 'username' ],
	queryableFields: [ 'nicename', 'email' ],
};

// Functions -----------------------------------------------------------------------------------------------------------

// register
router.post('/register', UserController.register);

// me
router.get('/me', auth, UserController.me);

//login
router.post('/login', UserController.login);

// generate link
router.post('/:id/link', UserController.generateLink);


// get avatar
router.get('/:id/avatar', UserController.avatar);

// update profile
router.put('/:id/profile', auth, UserController.updateProfile);

// ---------------------------------------------------------------------------------------------------------------------

setupRoute('user', router, options);

export { router };