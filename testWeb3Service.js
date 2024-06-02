import web3Service from './services/web3.service.js';
import ethers from 'ethers';

/// castVote

const idMexSimulation = 'IDMEX12345';
const addressCandidate1 = '0x1234567890123456789012345678901234567890';
const electoralVoteEncoded = ethers.utils.formatBytes32String(idMexSimulation);

const castVote = async () => {
	try {
		const tx = await web3Service.castVote(addressCandidate1, electoralVoteEncoded);
		console.log('Transaction hash:', tx.hash);
	} catch(error) {
		console.error('Error casting vote:', error);
	}
};

// first add the candidate
const addCandidate = async () => {
	try {
		const tx = await web3Service.addCandidate(addressCandidate1);
		console.log('Transaction hash:', tx.hash);
	} catch(error) {
		console.error('Error adding candidate:', error);
	}
};

// await addCandidate();
await castVote();

const getCandidate = async () => {
	try {
		const candidate = await web3Service.getCandidate(addressCandidate1);
		console.log('Candidate:', candidate.toString());
		/// print as normal number

	} catch(error) {
		console.error('Error getting candidate:', error);
	}
};

await getCandidate();