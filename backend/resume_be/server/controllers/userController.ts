import User from "../models/User";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Resume from "../models/Resume";
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";


const generateToken = (userId: any)=>{
    const token = jwt.sign({userId}, process.env.JWT_SECRET as string, {expiresIn: '7d'})
    return token;
}

// controller for user registration
// POST: /api/users/register
export const registerUser = async (req: AuthRequest, res: Response) => {
    try {
        const {name, email, password} = req.body;

        // check if required fields are present
        if(!name || !email || !password){
            return res.status(400).json({message: 'Missing required fields'})
        }

        // check if user already exists
        const user = await User.findOne({email})
        if(user){
            return res.status(400).json({message: 'User already exists'})
        }

        // create new user
         const hashedPassword = await bcrypt.hash(password, 10)
         const newUser = await User.create({
            name, email, password: hashedPassword
         })

         // return success message
         const token = generateToken(newUser._id)
         const { password: _, ...userObj } = newUser.toObject();

         return res.status(201).json({message: 'User created successfully', token, user: userObj})

    } catch (error) {
        return res.status(400).json({message: error instanceof Error ? error.message : 'An unknown error occurred'})
    }
}

// controller for user login
// POST: /api/users/login
export const loginUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password} = req.body;

        // check if user exists
        const user = await User.findOne({email})
        if(!user){
            return res.status(400).json({message: 'Invalid email or password'})
        }

        // check if password is correct
        if(!user.comparePassword(password)){
            return res.status(400).json({message: 'Invalid email or password'})
        }

        // return success message
         const token = generateToken(user._id)
         const { password: _, ...userObj } = user.toObject();

         return res.status(200).json({message: 'Login successful', token, user: userObj})

    } catch (error) {
        return res.status(400).json({message: error instanceof Error ? error.message : 'An unknown error occurred'})
    }
}

// controller for getting user by id
// GET: /api/users/data
export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        
        const userId = req.userId;

        // check if user exists
        const user = await User.findById(userId)
        if(!user){
            return res.status(404).json({message: 'User not found'})
        }
        // return user
        const { password: _, ...userObj } = user.toObject();
        return res.status(200).json({user: userObj})

    } catch (error) {
        return res.status(400).json({message: error instanceof Error ? error.message : 'An unknown error occurred'})
    }
}

// controller for getting user resumes
// GET: /api/users/resumes
export const getUserResumes = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;

        // return user resumes
        const resumes = await Resume.find({userId})
        return res.status(200).json({resumes})
    } catch (error) {
        return res.status(400).json({message: error instanceof Error ? error.message : 'An unknown error occurred'})
    }
}