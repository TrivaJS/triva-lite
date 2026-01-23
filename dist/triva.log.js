import { db } from "./triva.db.js";

export const log = {

    async push(req, res) {

        // Analytics

        // Log ID
        const logID = await db.get("loast_logID").then( async () => {
            await db.add('loast_logID', 1)
        })

    },
    
    async get(id) {

        const id = id || 'all'

        if(id == 'all'){
            return await db.get('logs');
        } else {
            const logs = (await db.get('logs')) || [];
            const log = logs.find(l => l.id === Number(id));
            if (!log) return ({ error: "Log not found" });
            return log;
        }

    },
    
    async remove(id) {

        const id = id || 'all'

    },

    async filter() {

    }

}

async function event_log(req, res) {
    
    await db.add('analytics.requests.all', 1) // Requests - All traffic

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

}

async function get_log(id) {
    if(id == null || id == undefined){
        // Has no ID, aka get all logs
    } else {
        // Has ID in request
    }
}

export {
    event_log,
    get_log
}