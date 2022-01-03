import express from 'express';
import bodyParser from 'body-parser';
import {MongoClient} from 'mongodb';
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '/build')));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(bodyParser.json());

const withDB = async (operations,res) => {
  try {

     const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true });
     const client_db = client.db('my-blog');

     await operations(client_db);

     client.close();

   } catch (error) {
      //console.log(error);
      res.status(500).json(`{ message: '${error}' }`);
   }
}

app.get('/api/articles/:name', async (req,res) => {

     withDB(async (db) => {
         const articleName = req.params.name;

         const articleInfo = await db.collection('articles').findOne({name: articleName});

         if (articleInfo != null) {
            res.status(200).json(articleInfo);
         } else {
           res.status(404).json(`{ message: '${articleName}' not found }`);
         }

     }, res);

});

// app.get('/hello',(req,res) => res.send('Hello!'));
// app.get('/hello/:name',(req,res) => res.send(`Hello ${req.params.name}`));
// app.post('/hello',(req,res) => res.send(`Hello ${req.body.name}`));

// app.post('/api/articles/:name/upvote', (req,res) => {
//   const articleName = req.params.name;
//   articlesInfo[articleName].upvotes += 1;
//   res.status(200).send(`${articleName} now has ${articlesInfo[articleName].upvotes} upvotes!!!`)
// })
app.post('/api/articles/:name/upvote', async (req,res) => {

  withDB( async (db) => {
     const articleName = req.params.name;

     const articleInfo = await db.collection('articles').findOne({name: articleName});
     if (articleInfo != null) {
        await db.collection('articles').updateOne( {name: articleName},{
                         '$set': {
                             upvotes: articleInfo.upvotes + 1,
                         }
                       });
        const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});
        res.status(200).json(updatedArticleInfo);
     } else {
       res.status(404).json(`{ message: '${articleName}' not found }`);
     }
  }, res);

})

// app.post('/api/articles/:name/add-comment', (req,res) => {
//   const articleName = req.params.name;
//   const {username, text} = req.body;
//   articlesInfo[articleName].comments.push({username, text});
//   const num_comments = articlesInfo[articleName].comments.length;
//   //res.status(200).send(articlesInfo[articleName]);  // this works
//   const articleFeedback = JSON.stringify(articlesInfo[articleName]);
//   // below does not work without stringify()
//   res.status(200).send(`comment added to ${articleName} \n\n` + articleFeedback + `\n\n Number of comments: ${num_comments}`);
// })

app.post('/api/articles/:name/add-comment', (req,res) => {
  const articleName = req.params.name;
  const {username, text} = req.body;

  withDB ( async (db) => {
      const articleInfo = await db.collection('articles').findOne({name: articleName});
      if (articleInfo != null) {
          await db.collection('articles').updateOne( {name: articleName},{
                           '$set': {
                               comments: articleInfo.comments.concat({username, text}),
                           }
                         });
          const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});
          res.status(200).json(updatedArticleInfo);
      }
      else {
          res.status(404).json(`{ message: '${articleName}' not found }`);
      }
  }, res);

})

app.get('*', (req,res) => {
   res.sendFile(path.join(__dirname + '/build/index.html'));
})

app.listen(8000, () => console.log('Listening on port 8000'));
