import ethers from 'ethers';
import VoteSystem from '../artifacts/contracts/VoteSystem.sol/VoteSystem.json'  assert { type: 'json' };

/// import dotenv
import dotenv from 'dotenv';
dotenv.config();
const privateKey = process.env.PRIVATE_KEY;

class Web3Service {
    static async castVote(candidate, electoralVoteEncoded) {

        console.log("Imprime pk y contract address")
        console.log(privateKey)
        console.log(process.env.CONTRACT_ADDRESS)
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VoteSystem.abi, wallet);
        const tx = await contract.castVote(candidate, electoralVoteEncoded);
        await tx.wait();
        return tx;
    }

    static async hasVoted(candidate, electoralVoteEncoded) {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VoteSystem.abi, wallet);
        return await contract.hasVoted(candidate, electoralVoteEncoded);
    }

    static async safeMint(to, uri) {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VoteSystem.abi, wallet);
        const tx = await contract.safeMint(to, uri);
        await tx.wait();
        return tx;
    }

    static async addCandidate(candidate) {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VoteSystem.abi, wallet);
        const tx = await contract.addCandidate(candidate);
        await tx.wait();
        return tx;
    }

    static async getCandidate(candidateAddress) {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VoteSystem.abi, provider);
        return await contract.candidates(candidateAddress);
    }

    static async getCandidateCount(idCandidate) {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VoteSystem.abi, provider);
        return await contract.candidate(idCandidate);
    }
}

export default Web3Service;
