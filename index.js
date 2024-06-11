const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

//database 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// ports
const port = process.env.PORT || 4000;


// middleware

app.use(cors());
app.use(express.json());


//custom middleware

// jwt generating
app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
    res.send({ token });
})


// middlewares 
const verifyToken = (req, res, next) => {
    // console.log('inside verify token', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        
        next();
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dsubcfq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
  
  
      const userCollection = client.db("MediCampDB").collection("users");
      const campsCollection = client.db("MediCampDB").collection("medicalCamps");
      const participantCollection = client.db("MediCampDB").collection("Participant");


      // use verify admin after verifyToken
      const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
      return res.status(403).send({ message: 'forbidden access' });
      }
      next();
      }
    
 
      app.get('/users/admin/:email',verifyToken,  async (req, res) => {
          const email = req.params.email;
    
          if (email !== req.decoded.email) {
            return res.status(403).send({ message: 'forbidden access' })
          }
    
          const query = { email: email };
          const user = await userCollection.findOne(query);
          let admin = false;
          if (user) {
            admin = user?.role === 'admin';
          }
          res.send({ admin });
        })
  
            //user operation

            app.post('/users', async (req, res) => {
              const user = req.body;
             
              const query = { email: user.email }
              const existingUser = await userCollection.findOne(query);
              if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
              }
              const result = await userCollection.insertOne(user);
            //   console.log('result', result)
              res.send(result);
            });

  
          //   user section end 

          //camp operation

          app.get("/popular_camps", async (req, res) => {

            const result = await campsCollection.find().sort({ "ParticipantCount": -1 }).limit(6).toArray();
            res.send(result);
            
          });

          app.get("/camp-details/:campId", verifyToken ,async (req, res) => {
            const campId = req.params.campId;
            const query = { _id: new ObjectId(campId) };
            const result = await campsCollection.findOne(query);
            res.send(result);
           
            
          });
        //join camp operation 
          app.post('/join-camp', verifyToken, async (req, res) => {
             
            const participant = req.body;

            // console.log(participant);
            const query = { ParticipantEmail: participant.ParticipantEmail ,
                CampId: participant.CampId
             }
            const existingParticipant = await participantCollection.findOne(query);
            if (existingParticipant) {
              return res.send({ message: 'user already exists', insertedId: null })
            }
           
            const result = await participantCollection.insertOne(participant);
            // console.log('result', result)

            // Increase the number of participants in the camp
           const campQuery = { _id: new ObjectId(participant.CampId) };
           const update = { $inc: { ParticipantCount: 1 } };
          const result1 =  await campsCollection.updateOne(campQuery, update);
            // console.log('result1', result1);
            res.send(result);

          });

          //all available camps

          app.get("/camps" , async (req, res) => {

            const size = parseInt(req.query.size)
            const page = parseInt(req.query.page) - 1
            const sort = req.query.sort
            const search = req.query.search

            let query = {
                $or: [
                    { CampName: { $regex: search, $options: 'i' } },
                    { CampFees: { $regex: search, $options: 'i' } },
                    { Date: { $regex: search, $options: 'i' } },
                    { Location: { $regex: search, $options: 'i' } },
                ],
            };
              
            let sortObj = {};
            if (sort === 'Most Registered') {
                sortObj = { ParticipantCount: -1 };
            } else if (sort === 'Camp Fees') {
                sortObj = { CampFees: 1 };
            } else if (sort === 'Alphabetical Order') {
                sortObj = { CampName: 1 };
            }
            const camps = await campsCollection.find(query).sort(sortObj).skip(page * size).limit(size).toArray();

            res.send(camps);
            // console.log(camps);


            
          });

          //getting camps count for pagination

          app.get("/camps_count" , async (req, res) => {
            const search = req.query.search
            let query = {
                $or: [
                    { CampName: { $regex: search, $options: 'i' } },
                    { CampFees: { $regex: search, $options: 'i' } },
                    { Date: { $regex: search, $options: 'i' } },
                    { Location: { $regex: search, $options: 'i' } },
                ],
            };

            const count = await campsCollection.countDocuments(query);

            res.send({ count });

          });

          // insert camps using admin 
          app.post('/camps', verifyToken, verifyAdmin, async (req, res) => {
            const camp = req.body;
            const result = await campsCollection.insertOne(camp);
            res.send(result);
          });
  
         
  
              
     
  

  
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
  
    
    }
  }
  run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('medical camp working')
})

app.listen(port, () => {

    console.log(`medical camp is working on port ${port}`);
})