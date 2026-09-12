import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth, AuthedRequest } from '../middleware/auth';
export function activityRoutes(){ const r=Router(); r.use(requireAuth); r.get('/',async(req:AuthedRequest,res,next)=>{try{const where:any=req.user!.role===Role.ADMIN?{}:req.user!.role===Role.PM?{project:{createdById:req.user!.id}}:{task:{developerId:req.user!.id}}; const activities=await prisma.activity.findMany({where,include:{user:{select:{name:true}},task:{select:{id:true,title:true}}},orderBy:{createdAt:'desc'},take:20});res.json({activities})}catch(e){next(e)}}); return r }
