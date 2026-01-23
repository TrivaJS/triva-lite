import { db } from "./triva.d.js";

/**
 * Set's up the backend functionality.
 *
 * This builds both the DB, with either default params or the user's custom config settings.
 *
 * @param {number} Port - The port on which the developer wants their project to run.
 * @private
 */

export async function build(dashboard_port) {

    await db.set('config', {
        dashboard_port: dashboard_port, 
        setup_complete: true, 
    }).then( async () => {

    })
    //await db.set('analytics', config.analytics)

}