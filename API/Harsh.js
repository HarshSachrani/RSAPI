const express = require('express');

const { Pool} = require('pg');

const cors = require('cors');

require('dotenv').config();

const app =express();

app.use(express.json());
app.use(cors());
const pool = new Pool({
connectionString : process.env.DATABASE_URL,
ssl: {
rejectUnauthorized: false
}
});

//GET (READ) POST (Create) PUT (UPDATE) Delete (Delete)
app.get('/', (req, res)=>{
try{
 res.json({message : "WELCOME>>>!"});
}catch(err){
res.status(500).json({error : err.message});
}
})
//
app.get('/regions', async(req, res)=>{
try{
const result = await pool.query('select * from regions');
res.json(result.rows);
}catch(err){
res.status(500).json({error: err.message});
}
})
app.listen(3000, ()=>{

console.log('SERVER IS RUNNING ON PORT 3000');
});