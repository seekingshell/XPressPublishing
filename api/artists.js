const express = require('express');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');
const artistsRouter = express.Router();

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

module.exports = artistsRouter;
