import jwt from 'jsonwebtoken';


export const authmiddleware=(req:any,res:any,next:any)=>{
    const authHeader=req.headers.authorization;
    if(!authHeader){
        console.log('[authmiddleware] Authorization header missing');
        console.log('Auth failed: no authorization header');
        return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token=authHeader.split(' ')[1];
    if(!token){
        console.log('[authmiddleware] Token missing in header:', authHeader);
        console.log('Auth failed: token missing from header');
        return res.status(401).json({ error: 'Token missing' });
    }

    try{
        console.log('[authmiddleware] Verifying token. Raw header:', authHeader);
        const decoded=jwt.verify(token,process.env.JWT_SECRET || 'defaultsecret');
        console.log('[authmiddleware] Token verified. userId:', (decoded as any)?.userId);
        req.user=decoded;
        next();
    }
    catch(err){
        console.error('[authmiddleware] Token verification failed:', err);
        return res.status(401).json({ error: 'Invalid token' });
    }
}