const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ports
const port = process.env.PORT || 4000;


// middleware

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('medical camp working')
  })
  
  app.listen(port, () => {

    console.log(`medical camp is working on port ${port}`);
  })