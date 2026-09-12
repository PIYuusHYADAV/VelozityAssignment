import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRoles, AuthedRequest } from '../middleware/auth';
export function adminRoutes(){ const r=Router(); r.use(requireAuth,requireRoles(Role.ADMIN));
 r.get('/users',async(_req,res,next)=>{try{const users=await prisma.user.findMany({select:{id:true,name:true,email:true,role:true},orderBy:{name:'asc'}});res.json({users})}catch(e){next(e)}});
 r.get('/clients',async(_req,res,next)=>{try{const clients=await prisma.client.findMany({orderBy:{name:'asc'}});res.json({clients})}catch(e){next(e)}});
 r.post('/clients',async(req,res,next)=>{try{const body=z.object({name:z.string().min(2),email:z.string().email().optional()}).parse(req.body);const client=await prisma.client.create({data:body});res.status(201).json({client})}catch(e){next(e)}});
 return r }
