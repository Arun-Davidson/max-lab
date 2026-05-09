import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcrypt'

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    comparePassword: (password: string) => boolean;
}

const UserSchema = new mongoose.Schema({
    name: {type: String, required: true },
    email: {type: String, required: true, unique: true },
    password: {type: String, required: true },
}, {timestamps: true })

UserSchema.methods.comparePassword = function (password:string){
    return bcrypt.compareSync(password, this.password)
}

const User = mongoose.model<IUser>("User", UserSchema)

export default User;
