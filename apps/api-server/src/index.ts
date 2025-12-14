import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/auth.js';
const app=express();

app.use(express.json());
 app.use('/auth',authRoutes);
//  app.use('/rooms',roomRoutes);

app.get('/',async(req,res)=>{
    res.send('Hello World');
})
app.listen(4000,()=>{
    console.log('Server is running on port 4000');
})