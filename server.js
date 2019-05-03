const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
const PORT = process.env.PORT || 4000;
const apiRouter = require('./api/api');

app.use(bodyParser.json());
app.use(cors());
app.use('/api', apiRouter);

app.listen(PORT, ()=>{
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
