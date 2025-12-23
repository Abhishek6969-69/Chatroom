import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import type { Prisma } from '@prisma/client';
import {prisma} from '../../../prisma/client.js'
import {signupSchema} from '../validators/auth.schema.js'
import {loginSchema} from '../validators/auth.schema.js';
const authrouter=express.Router();

authrouter.post('/signup',async(req,res)=>{
    // const {username,password}=req.body;
    try{
       const data=signupSchema.parse(req.body);
    const {username,password}=data;

    const hashedPassword=await bcrypt.hash(password,10);
    const user=await prisma.user.create({
        data:{
            username,
            hashedPassword 
        }
    })
    console.log('User created:',user.id);
    const token=jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '1h' }
    );
    return res.json({
        id:user.id,
        username:user.username,
        token
    })
    }
    catch(err: unknown){
        console.error('Signup failed', err);
        if (err instanceof ZodError) {
            return res.status(400).json({ error: err.issues });
        }
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) });
    }
   
})

authrouter.post('/login',async(req,res)=>{

try{
   const result=loginSchema.parse(req.body); 
   const{username,password}=result;

   const user=await prisma.user.findUnique({
    where:{
        username
    }
   })
   if(!user){
    return res.status(401).json({ error: 'Invalid username or password' });
   }

   const isPasswordValid=await bcrypt.compare(password,user.hashedPassword);
   if(!isPasswordValid){
    return res.status(401).json({ error: 'Invalid username or password' });
   }

   const token=jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET || 'defaultsecret',
    { expiresIn: '1h' }
);

   return res.json({ token , user: { id: user.id, username: user.username } });
}
catch(err){         
    return res.status(500).json({ error: 'Internal server error' });
}
})

export default authrouter;