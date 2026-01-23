import { createMiddleware } from '../index.js';
import express from 'express';

const middleware = createMiddleware({})

const app = express()

app.use(middleware)
app.get("/test", (req, res) => {
    res.send('test')
})
app.listen(1500, () => {console.log('Good to go')})