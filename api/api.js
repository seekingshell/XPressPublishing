const express = require('express');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
const apiRouter = express.Router();

const artistsRouter = require('./artists');
apiRouter.use('/artists', artistsRouter);

const seriesRouter = require('./series');
apiRouter.use('/series', seriesRouter);

module.exports = apiRouter;
