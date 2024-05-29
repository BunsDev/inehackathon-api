import web3Service from "../services/web3.service.js";
class web3Controller {

    // castVote receieves via post candidate and idVote
    static async castVote(req, res){

        const { candidate, idVote } = req.body;
        try {
            const tx = await web3Service.castVote(candidate, idVote);
            res.respond({
                status: 200,
                data: tx.hash,
            });
        } catch (error) {
            res.respond({
                status: 400,
                message: 'Error casting vote: ' + error.message,
            });
        }

    }

    // add candidate
    static async addCandidate(req, res){

        const { candidate } = req.body;
        try {
            const tx = await web3Service.addCandidate(candidate);
            res.respond({
                status: 200,
                data: tx.hash,
            });
        } catch (error) {
            res.respond({
                status: 400,
                message: 'Error adding candidate: ' + error.message,
            });
        }
    }

    static async getCandidate(req, res){
        // receive via :id the candidate address
        const { id } = req.params;
        try {
            const candidate = await web3Service.getCandidate(id);
            res.respond({
                status: 200,
                data: candidate,
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