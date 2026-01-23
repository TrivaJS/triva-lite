import { db } from "./triva.d";

export async function event_log(req, res) {

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