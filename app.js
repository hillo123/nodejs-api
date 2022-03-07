const express = require('express');
const app = express();
const port = 3000;
const https = require("https");

const cron = require('node-cron');

/*Mongo*/
const mongoClient = require("mongodb").MongoClient
const objectId = require('mongodb').ObjectID
const url = "mongodb+srv://gamercityuser:gamercityuser@cluster0-yfwwm.mongodb.net/test?retryWrites=true&w=majority"
let conn


async function getConnection() {
  if (!conn) {
    conn = await mongoClient.connect(url, { useUnifiedTopology: true })
  }
  return conn
}


app.delete("/item/:id", async (req, res) => {
  const oid = objectId.createFromHexString(req.params.id)
  try {
    const conn = await getConnection()
    await conn.db('testnodejs').collection('nodejs').findOneAndDelete({ "_id": oid })
    res.status(200)
    res.json('Deleted _id: ' + oid)
  }
  catch (e) {
    res.status(500).json({ message: "Error Occured" })
  }
});

app.get("/data/", paginatedData(), (req, res) => {
  res.json(res.paginatedData);
});

function paginatedData() {
  return async (req, res, next) => {

    const titleSearch = req.query.title;
    const tagsSearch = [req.query.tags];
    const authorSearch = req.query.author;
    const page = parseInt(req.query.page);
    const skipIndex = (page - 1) * 5;
    const results = {};
    try {
      const conn = await getConnection()
      if (authorSearch && tagsSearch.length > 1 && titleSearch) {
        results.results = await conn.db('testnodejs').collection('nodejs').find({ author: authorSearch, title: { $regex: titleSearch }, _tags: tagsSearch }).skip(skipIndex).limit(5).toArray()
        res.paginatedData = results;
        next();
      }
      else if (authorSearch && tagsSearch.length > 1) {
        results.results = await conn.db('testnodejs').collection('nodejs').find({ author: authorSearch, _tags: tagsSearch }).skip(skipIndex).limit(5).toArray()
        res.paginatedData = results;
        next();
      }
      else if (authorSearch && titleSearch) {

        results.results = await conn.db('testnodejs').collection('nodejs').find({ author: authorSearch, title: { $regex: titleSearch } }).skip(skipIndex).limit(5).toArray()
        res.paginatedData = results;
        next();
      }
      else if (authorSearch) {

        results.results = await conn.db('testnodejs').collection('nodejs').find({ author: authorSearch }).skip(skipIndex).limit(5).toArray()
        res.paginatedData = results;
        next();
      }
      else if (titleSearch) {

        results.results = await conn.db('testnodejs').collection('nodejs').find({ title: { $regex: titleSearch } }).skip(skipIndex).limit(5).toArray()
        res.paginatedData = results;
        next();
      }
      else if (tagsSearch.length >= 1) {

        results.results = await conn.db('testnodejs').collection('nodejs').find({ _tags: { $all: tagsSearch } }).skip(skipIndex).limit(5).toArray()
        res.paginatedData = results;
        next();
      }
      else res.status(400).json({ message: "Enter the key" });
    } catch (e) {
      res.status(500).json({ message: "Error Occured" });
      console.log(e)
    }
  };
}

// worker scheduled every 01 min each Hour
const worker = cron.schedule("01 01 * * * *", () => {
  https.get('https://hn.algolia.com/api/v1/search_by_date?query=nodejs', res => {
    let data = [];

    res.on('data', chunk => {
      data.push(chunk);
    });

    res.on('end', async () => {
      console.log('Response ended: ');
      const users = JSON.parse(Buffer.concat(data).toString());
      console.log(users.hits)
      const conn = await getConnection()
      return (await conn.db('testnodejs').collection('nodejs').insertMany(users.hits))
    });
  })


});


app.listen(port, () => {
  console.log("The server is initialized", port);
});

