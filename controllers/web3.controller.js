import web3Service from "../services/web3.service.js";
import ethers from "ethers";
import {sha256} from "ethers/lib/utils.js";

class web3Controller {

    // castVote receieves via post candidate and idVote

    static async mintVoteProof(req, res) {
        // get address from body
        const {address} = req.body;
        try {
            const tx = await web3Service.mintVoteProof(address, 'https://blockchainstarter.nyc3.digitaloceanspaces.com/inehack/vote.png');
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
                message: 'Error minting vote proof: ' + error.message,
            });
        }
    }
    static async castVote(req, res) {
        const { candidate, idVote } = req.body;

        try {
            // Concatenar candidate e idVote
            const concatenatedData = candidate + idVote;

            // Hashear la concatenación
            const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(concatenatedData));

            // Convertir el hash a bytes32
            const electoralVoteEncoded = ethers.utils.hexZeroPad(hash, 32);

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
        const candidates = {
        "federales": {
            "0x8532a6CbEA6a7d30B46E5a015391840Ff1C472F3": "Xóchitl Gálvez",
            "0x1234567890123456789012345678901234567891": "Claudia Sheinbaum",
            "0x1234567890123456789012345678901234567892": "Jorge Álvarez Máynez",
        },
        "estatales": {
            "0xAF0C47284442069bedF8F01B954DE9CAD0fB51De": "Clara Brugada",
            "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7": "Santiago Taboada",
            "0x3BCE63C6C9ABf7A47f52c9A3a7950867700B0158": "Salomón Chertorivski"
        }
    }

        // receive via :id the candidate address
        const {id} = req.params;
        try {
            const candidate = await web3Service.getCandidate(id);
            let findCandidate;
            for (const key in candidates) {
                if (candidates[key][id]) {
                    findCandidate = candidates[key][id];
                    break;
                }
            }
            res.respond({
                status: 200,
                data: {
                    count: candidate,
                    idCandidate: id,
                    name: findCandidate
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