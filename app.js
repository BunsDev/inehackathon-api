import primate from '@thewebchimp/primate';
import { router as def } from './routes/default.js';
import { router as web3Routes } from './routes/web3Routes.js';
await primate.setup();
await primate.start();

primate.app.use('/', def);
primate.app.use('/web3', web3Routes);