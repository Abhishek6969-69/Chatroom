import jwt from 'jsonwebtoken';


export const authmiddleware=(req:any,res:any,next:any)=>{
    const authHeader=req.headers.authorization;
    if(!authHeader){
        return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token=authHeader.split(' ')[1];
    if(!token){
        return res.status(401).json({ error: 'Token missing' });
    }

    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET || 'defaultsecret');
        req.user=decoded;
        next();
    }
    catch(err){
        return res.status(401).json({ error: 'Invalid token' });
    }
}