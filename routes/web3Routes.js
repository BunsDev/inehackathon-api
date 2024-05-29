import { getRouter, auth, setupRoute } from '@thewebchimp/primate';
import web3Controller from '../controllers/web3.controller.js';
const router = getRouter();

const options = {};


router.post('/castVote',  web3Controller.castVote);
router.post('/addCandidate', web3Controller.addCandidate);
router.get('/:id/candidate', web3Controller.getCandidate);

export { router };