const express = require('express');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
const seriesRouter = express.Router();

seriesRouter.get('/', (req,res,next)=>{
  db.all('SELECT * FROM Series',(err,rows)=>{
    res.status(200).json({series: rows});
  });
});

function validateSeries(req,res,next) {
  const series = req.body.series;
  if(!series.name || !series.description) {
    return res.sendStatus(400);
  }
  next();
}

seriesRouter.post('/', validateSeries, (req,res,next)=>{
  const series = req.body.series;
  db.run('INSERT INTO Series (name,description) VALUES ($name,$desc)',{
    $name: series.name,
    $desc: series.description
  },
    function(err) {
      if(err) {
        return res.sendStatus(500);
      }
      db.get(`SELECT * FROM Series WHERE id=${this.lastID}`,(err,row)=>{
        res.status(201).json({series: row});
      });
    });
});

seriesRouter.param('seriesId',(req,res,next,id)=>{
  db.get(`SELECT * FROM Series WHERE id=${id}`,(err,row)=>{
    if(!row) {
      return res.sendStatus(404);
    }
    req.series = row;
    next();
  })
});

seriesRouter.get('/:seriesId',(req,res,next)=>{
  res.status(200).json({series: req.series});
});

seriesRouter.put('/:seriesId',validateSeries, (req,res,next)=>{
  const series = req.body.series;
  db.run('UPDATE Series SET name=$name, description=$desc WHERE id=$id', {
    $name: series.name,
    $desc: series.description,
    $id: req.params.seriesId
  }, (err)=>{
    if(err) {
      return res.sendStatus(500);
    }
    db.get(`SELECT * FROM Series WHERE id=${req.params.seriesId}`, (err, row)=>{
      res.status(200).json({series: row});
    });
  });
});

seriesRouter.delete('/:seriesId',(req,res,next)=>{
  db.get(`SELECT * FROM Issue WHERE series_id=${req.params.seriesId}`, (err,row)=>{
    if(err) {
      return res.sendStatus(500);
    }
    if(row) {
      // we don't want to delete a series that has related issues
      return res.sendStatus(400);
    }

    db.run(`DELETE FROM Series WHERE id=${req.params.seriesId}`,(err)=>{
      if(err) {
        return res.sendStatus(500);
      }
      res.sendStatus(204);
    })
  })
});

seriesRouter.get('/:seriesId/issues',(req,res,next)=>{
  db.all(`SELECT * FROM Issue WHERE series_id=${req.params.seriesId}`,(err,rows)=>{
    if(err) {
      return res.sendStatus(500);
    }
    res.status(200).json({issues: rows});
  });
});

function validateIssue(req,res,next) {
  const issue = req.body.issue;
  if(!issue.name || !issue.issueNumber || !issue.publicationDate ||
      !issue.artistId) {
        return res.sendStatus(400);
      }
  db.get(`SELECT * FROM Artist WHERE id=${issue.artistId}`,(err,row)=>{
    if(!row) {
      return res.sendStatus(400);
    }
    next();
  });
}

seriesRouter.post('/:seriesId/issues',validateIssue, (req,res,next)=>{
  const issue = req.body.issue;
  db.run('INSERT INTO Issue (name, issue_number, publication_date, artist_id, series_id) VALUES ($name,$in,$pd,$a,$s)',{
    $name: issue.name,
    $in: issue.issueNumber,
    $pd: issue.publicationDate,
    $a: issue.artistId,
    $s: req.params.seriesId
  }, function(err) {
    if(err) {
      return res.sendStatus(500);
    }
    db.get(`SELECT * FROM Issue WHERE id=${this.lastID}`, (err,row)=>{
      res.status(201).json({issue: row});
    });
  });
});

seriesRouter.param('issueId',(req,res,next,id)=>{
  db.get(`SELECT * FROM Issue WHERE id=${id}`, (err, row)=>{
    if(!row) {
      return res.sendStatus(404);
    }
    next();
  });
});

seriesRouter.put('/:seriesId/issues/:issueId', validateIssue, (req,res,next)=>{
  const issue = req.body.issue;
  db.run('UPDATE Issue SET name=$name, issue_number=$in, publication_date=$pd, artist_id=$a, series_id=$s WHERE id=$id', {
    $name: issue.name,
    $in: issue.issueNumber,
    $pd: issue.publicationDate,
    $a: issue.artistId,
    $s: req.params.seriesId,
    $id: req.params.issueId
  }, (err)=>{
    db.get(`SELECT * FROM Issue WHERE id=${req.params.issueId}`, (err,row)=>{
      res.status(200).json({issue: row});
    });
  });
});

seriesRouter.delete('/:seriesId/issues/:issueId',(req,res,next)=>{
  db.run(`DELETE FROM Issue WHERE id=${req.params.issueId}`, (err)=>{
    res.sendStatus(204);
  });
});

module.exports = seriesRouter;
