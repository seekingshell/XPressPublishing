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
  db.run('INSERT INTO Artist (name, date_of_birth, biography) VALUES ($name,$dob,$bio)', {
      $name: artist.name,
      $dob: artist.dateOfBirth,
      $bio: artist.biography
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
    if(err) {
      return res.sendStatus(404);
    }

    if(req.body.artist) {
      if(req.body.artist.id != Number(id)) {
        return res.sendStatus(400);
      }
    }
    req.artist = row;
    next();
  });
});

artistsRouter.get('/:artistId', (req,res,next)=>{
  res.status(200).json({ artist: req.artist} );
});

artistsRouter.put('/:artistId', validateArtist, (req,res,next)=>{
  const artist = req.artist;
  db.run('UPDATE Artist SET name=$name, date_of_birth=$dob, biography=$bio, is_currently_employed=$em WHERE id=$id', {
      $name: artist.name,
      $dob: artist.dateOfBirth,
      $bio: artist.biography,
      $em: artist.isCurrentlyEmployed,
      $id: artist.id
    }, function(err) {
      if(err) {
        return res.sendStatus(500);
      }

      db.get(`SELECT * FROM Artist WHERE id=${this.lastID}`,(err,row)=>{
        res.status(200).json({artist: row});
      });
  });
});

app.listen(PORT, ()=>{
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
