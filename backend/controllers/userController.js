import validator from "validator";
import userModel from "../models/userModel.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'


const createToken = (id) =>{
    return jwt.sign({ id },process.env.JWT_SECRET)
}

//Route for user login
const loginUser = async (req,res) =>{
    try {
        const {email,password} = req.body;
        const user = await userModel.findOne({email});
        if (!user) {
            return res.json({success:false,message:"user does not exists"})

        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (isMatch) {
            const token = createToken(user._id)
            res.json({success:true,token})
        }
        else{
            res.json({success:false,message:'invalid credentials'})
        }
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }

}
//Route for user registration
const registerUser = async (req,res)=>{
    try {
        const {name,email,password} = req.body;
        //checking user already exists or not 
        const exists = await userModel.findOne({email})
        if (exists) {
            return res.json({success:false,message:"user alreagy exists"})
        }
        //validating user email format and strong password
        
        if (!validator.isEmail(email)) {
            return res.json({success:false,message:"Please enter a valid email"})
        }
        if (password.length <8 ) {
            return res.json({success:false,message:"please enter strong password"})
        }
        //hashing user password
        const salt = await bcrypt.genSalt(10)
        const hashedpassword = await bcrypt.hash(password,salt)
        const newUser = new userModel({
            name,
            email,
            password:hashedpassword
        })
        const user = newUser.save()
        const token = createToken(user._id)
        res.json({success:true,token})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}
//Route for admin logn
const adminLogin = async(req,res) =>{
    try {
        const {email,password} = req.body
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email+password,process.env.JWT_SECRET);
            res.json({success:true,token})   
        }else{
            res.json({success:false,message:"invalid credential"})
        }
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}
export{loginUser,registerUser,adminLogin}