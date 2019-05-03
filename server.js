const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(cors());
const artistsRouter = express.Router();
app.use('/api/artists', artistsRouter);

const seriesRouter = express.Router();
app.use('/api/series', seriesRouter);

artistsRouter.get('/', (req,res,next)=>{
  db.all('SELECT * FROM Artist WHERE is_currently_employed=1',(err,rows)=>{
    if(err) {
      return res.sendStatus(500);
    }
    res.status(200).send({ artists: rows });
  })
});

function validateArtist(req,res,next) {
  const artist = req.body.artist;
  if(!artist.name || !artist.dateOfBirth || !artist.biography) {
    return res.sendStatus(400);
  }
  next();
}

artistsRouter.post('/', validateArtist, (req,res,next)=>{
  const artist = req.body.artist;
  db.run('INSERT INTO Artist (name, date_of_birth, biography, is_currently_employed) VALUES ($name,$dob,$bio,$em)', {
      $name: artist.name,
      $dob: artist.dateOfBirth,
      $bio: artist.biography,
      $em: artist.isCurrentlyEmployed || 1
    }, function(err) {
      if(err) {
        return res.sendStatus(500);
      }
      db.get(`SELECT * FROM Artist WHERE id=${this.lastID}`,(err,row)=>{
        res.status(201).json({ artist: row });
      });
    });
});

artistsRouter.param('artistId', (req,res,next,id)=>{
  db.get(`SELECT * FROM Artist WHERE id=${id}`, (err,row)=>{
    if(err || !row) {
      return res.sendStatus(404);
    }

    req.artist=row;
    next();
  });
});

artistsRouter.get('/:artistId', (req,res,next)=>{
  res.status(200).json({ artist: req.artist} );
});

artistsRouter.put('/:artistId', validateArtist, (req,res,next)=>{
  const artist = req.body.artist;
  db.run('UPDATE Artist SET name=$name, date_of_birth=$dob, biography=$bio, is_currently_employed=$em WHERE id=$id', {
      $name: artist.name,
      $dob: artist.dateOfBirth,
      $bio: artist.biography,
      $em: artist.isCurrentlyEmployed,
      $id: req.params.artistId
    }, function(err) {
      if(err) {
        return res.sendStatus(500);
      }

      db.get(`SELECT * FROM Artist WHERE id=${req.params.artistId}`,(err,row)=>{
        res.status(200).json({artist: row});
      });
  });
});

artistsRouter.delete('/:artistId', (req,res,next)=>{
  db.run(`UPDATE Artist SET is_currently_employed=0 WHERE id=${req.params.artistId}`,
    (err)=>{
      if(err) {
        return res.sendStatus(500);
      }
      db.get(`SELECT * FROM Artist WHERE id=${req.params.artistId}`,
      (err,row)=>{
        res.status(200).json({artist: row});
      });
  });
});

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

app.listen(PORT, ()=>{
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
