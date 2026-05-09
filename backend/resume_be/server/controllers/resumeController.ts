import imagekit from "../configs/imageKit";
import mongoose from "mongoose";
import Resume from "../models/Resume";
import fs from 'fs';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';


// controller for creating a new resume
// POST: /api/resumes/create
export const createResume = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const data = req.body;

        // Map camelCase fields to snake_case expected by the model
        const resumeData = {
            userId,
            title: data.title || 'Untitled Resume',
            professional_summary: data.professionalSummary || data.professional_summary || '',
            skills: data.skills || [],
            personal_info: {
                full_name: data.personalInfo?.fullName || data.personalInfo?.full_name || '',
                email: data.personalInfo?.email || '',
                phone: data.personalInfo?.phone || '',
                location: data.personalInfo?.location || '',
                profession: data.personalInfo?.profession || '',
                linkedin: data.personalInfo?.linkedin || '',
                website: data.personalInfo?.website || '',
                image: data.personalInfo?.image || '',
            },
            experience: (data.experience || []).map((exp: any) => ({
                company: exp.company,
                position: exp.position,
                start_date: exp.startDate || exp.start_date,
                end_date: exp.endDate || exp.end_date,
                description: exp.description,
                is_current: exp.isCurrent || exp.is_current,
            })),
            education: (data.education || []).map((edu: any) => ({
                institution: edu.institution,
                degree: edu.degree,
                field: edu.field,
                graduation_date: edu.graduationYear || edu.graduation_date,
                gpa: edu.gpa,
            })),
            project: (data.project || []).map((proj: any) => ({
                name: proj.name,
                type: proj.type,
                description: proj.description,
            })),
            public: data.public ?? false,
            template: data.template || 'classic',
            accent_color: data.accentColor || data.accent_color || '#3B82F6',
        };

        // create new resume
        const newResume = await Resume.create(resumeData)
        // return success message
        return res.status(201).json({message: 'Resume created successfully', resume: newResume})

    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "An unknown error occurred" })
    }
}

// controller for deleting a resume
// DELETE: /api/resumes/delete
export const deleteResume = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const {resumeId} = req.params;

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({ message: "Invalid resume ID format" });
        }

       await Resume.findOneAndDelete({userId, _id: resumeId})

        // return success message
        return res.status(200).json({message: 'Resume deleted successfully'})

    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "An unknown error occurred" })
    }
}


// get user resume by id
// GET: /api/resumes/get
export const getResumeById = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const {resumeId} = req.params;

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({ message: "Invalid resume ID format" });
        }

       const resume = await Resume.findOne({userId, _id: resumeId}).select('-__v -createdAt -updatedAt')
 
        if(!resume){
         return res.status(404).json({message: "Resume not found"})
        }
 
         return res.status(200).json({resume})

    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "An unknown error occurred" })
    }
}

// get resume by id public
// GET: /api/resumes/public
export const getPublicResumeById = async (req: AuthRequest, res: Response) => {
    try {
        const { resumeId } = req.params;

        if (!mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({ message: "Invalid resume ID format" });
        }

        const resume = await Resume.findOne({public: true, _id: resumeId})

        if(!resume){
        return res.status(404).json({message: "Resume not found"})
       }

       return res.status(200).json({resume})
    } catch (error) {
         return res.status(400).json({ message: error instanceof Error ? error.message : "An unknown error occurred" })
    }
}

// controller for updating a resume
// PUT: /api/resumes/update
export const updateResume = async (req: AuthRequest, res: Response) =>{
    try {
        const userId = req.userId;
        const {resumeId, resumeData, removeBackground} = req.body;

        if (resumeId && !mongoose.isValidObjectId(resumeId)) {
            return res.status(400).json({ message: "Invalid resume ID format" });
        }

        const image = req.file;
        
        let resumeDataCopy; 
        if(typeof resumeData === 'string'){
            resumeDataCopy = await JSON.parse(resumeData)
        }else{
            resumeDataCopy = structuredClone(resumeData)
        }

        if(image){
            const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
            
            if (privateKey && privateKey.trim() !== "") {
                const imageBufferData = fs.createReadStream(image.path)

                const response = await imagekit.files.upload({
                                file: imageBufferData,
                                fileName: 'resume.png',
                                folder: 'user-resumes',
                                 transformation: {
                                    pre: 'w-300,h-300,fo-face,z-0.75' + (removeBackground ? ',e-bgremove' : '')
                                 }
                                });

                if (!resumeDataCopy.personal_info) {
                    resumeDataCopy.personal_info = {};
                }
                resumeDataCopy.personal_info.image = response.url
            } else {
                console.warn("[Resume BE] Skipping image upload: IMAGEKIT_PRIVATE_KEY is not configured.");
            }
        }

    //    const resume = await Resume.findByIdAndUpdate({userId, _id: resumeId}, resumeDataCopy, {new: true})
    const resume = await Resume.findOneAndUpdate({userId, _id: resumeId}, resumeDataCopy, {new: true})

       return res.status(200).json({message: 'Saved successfully', resume})
    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "An unknown error occurred" })
    }
}