import web3Service from "../services/web3.service.js";
import ethers from "ethers";

class web3Controller {

    // castVote receieves via post candidate and idVote
    static async castVote(req, res) {

        const {candidate, idVote} = req.body;
        try {
            const electoralVoteEncoded = ethers.utils.formatBytes32String(idVote);
            const tx = await web3Service.castVote(candidate, electoralVoteEncoded);
            res.respond({
                status: 200,
                data: {
                    hash: tx.hash,
                    urlTestnet: `https://testnet.snowtrace.io/tx/${tx.hash}`
                },
            });
        } catch (error) {
            res.respond({
                status: 400,
                message: 'Error casting vote: ' + error.message,
            });
        }

    }

    // add candidate
    static async addCandidate(req, res) {

        const {candidate} = req.body;
        try {
            const tx = await web3Service.addCandidate(candidate);
            res.respond({
                status: 200,
                data: {
                    hash: tx.hash,
                    urlTestnet: `https://testnet.snowtrace.io/tx/${tx.hash}`
                }
            });
        } catch (error) {
            res.respond({
                status: 400,
                message: 'Error adding candidate: ' + error.message,
            });
        }
    }

    static async getCandidate(req, res) {

        // candidates relationship addresss to name

        const candidates = {
            '0x8532a6CbEA6a7d30B46E5a015391840Ff1C472F3': 'Xochitl Gálvez',
            '0x1234567890123456789012345678901234567891': 'Claudia Sheinbaum',
            '0x1234567890123456789012345678901234567892': 'Jorge Alvarez Maynez',
        }

        // receive via :id the candidate address
        const {id} = req.params;
        try {
            const candidate = await web3Service.getCandidate(id);
            res.respond({
                status: 200,
                data: {
                    count: candidate,
                    idCandidate: id,
                    name: candidates[id]
                },
            });
        } catch (error) {
            res.respond({
                status: 400,
                message: 'Error getting candidate: ' + error.message,
            });
        }
    }
}

export default web3Controller;