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
        const candidate =  await contract.candidates(candidateAddress);
        return candidate.toString()
    }

    static async getCandidateCount(idCandidate) {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VoteSystem.abi, provider);
        return await contract.candidate(idCandidate);
    }

    static async mintVoteProof(to, uri) {
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);


        /// genera abi para usar safeMint
        const nftAbi = [
            "function safeMint(address to, string memory uri) public returns (uint256)"
        ];

        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, nftAbi, wallet);
        console.log("Imprime el contrato")
        console.log(contract)
        const tx = await contract.safeMint(to, uri);
        await tx.wait();
        return tx;
    }
}

export default Web3Service;
