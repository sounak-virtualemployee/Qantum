const express = require('express')
const dotenv = require('dotenv')
dotenv.config();
const userRoutes = require('./routes/userRoutes')
require('./config/dbConnection');
const cors = require('cors')

const PORT = process.env.PORT || 8081
const app = express();

// Add this to parse incoming JSON requests
app.use(express.json());

app.use(cors());

app.use('/user', userRoutes);

app.get('/',(req,res)=>{
   res.json({message:"Hello The Backend Is In Running Condition"})
})

app.listen(PORT, ()=>{
    // Log a message when the server is successfully running
  console.log(`Server is running on http://localhost:${PORT} port`);
})