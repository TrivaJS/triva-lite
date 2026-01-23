import { db } from "./triva.db.js";
import { parseUA } from '@triva/ua-parser';

export const log = {

    async push(req, res) {

        // ---- User Agent Parsing ----
        const data = parseUA(req.headers["user-agent"])
        console.log(data)

        // Analytics

        // Log ID
        const logID = await db.get("loast_logID").then( async () => {
            await db.add('loast_logID', 1)
        })

        async function create_log(){
        const logEntry = {
            id: logID+1,
            time: new Date().toLocaleString(),
            userData: {
                ip: req.socket?.remoteAddress,
            },
            requestData: {
                method: req.method,
                url: req.url,
            }
        }
        await db.push('logs', logEntry);
        return;
    }

    await create_log() // Requires rework with automatic redirect development - Very early log setup

    },
    
    async get(id) {

    },
    
    async remove(id) {

    },

    async filter() {

    }

}