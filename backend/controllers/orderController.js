import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import axios from 'axios';
import dotenv from 'dotenv';


dotenv.config();
//global variables
const currency = 'usd'
const deliveryCharges = 10

//gateway initialized
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const razorpayInstance = new razorpay({
    key_id : process.env.RAZORPAY_KEY_ID,
    key_secret : process.env.RAZORPAY_KEY_SECRET,
})

// placing order using COD Method
const placeOrder = async (req,res) =>{
    try {
        const {userId,items,amount,address} = req.body;
        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"COD",
            payment:false,
            date:Date.now()
        }
        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId,{cartData:{}})
        res.json({success:true,message:"order placced"})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

// Verify stripe
const verifyStripe = async (req,res) =>{
    const {orderId,success,userId} = req.body
    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId,{payment:true});
            await userModel.findByIdAndUpdate(userId,{cartData:{}})
            res.json({success: true});
        }else{
            await orderModel.findByIdAndDelete(orderId)
            res.json({success:false})
        }
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}
// placing order using Stripe Method
const placeOrderStripe = async (req,res) =>{
    try {
        const {userId,items,amount,address} = req.body;
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"Stripe",
            payment:false,
            date:Date.now()
        }
        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = items.map((item) => ({
            price_data:{
                currency:currency,
                product_data:{
                    name:item.name
                },
                unit_amount:item.price * 135
            },
            quantity:item.quantity
        }))
        line_items.push({
            price_data:{
                currency:currency,
                product_data:{
                    name:'Delivery charges'
                },
                unit_amount:deliveryCharges * 135
            },
            quantity:1
        })
        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
        })
        res.json({success:true,session_url:session.url})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}
//placing order using Mpesa


export const getMpesaToken = async () => {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('MPesa Token Error:', error.response.data);
        throw new Error('Failed to get MPesa token');
    }
};

export const stkPush = async (req, res) => {
const { phone, amount } = req.body;

const token = await getMpesaToken();
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0'); // Ensure 2 digits
const date = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const seconds = String(now.getSeconds()).padStart(2, '0');
const timestamp = `${year}${month}${date}${hours}${minutes}${seconds}`;

console.log("Generated Timestamp:", timestamp); 

    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    const requestBody = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: 174379,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: 'be smart',
        TransactionDesc: 'Payment for services'
    };

    try {
        const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', requestBody, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.json({ success: true, message: 'STK Push Sent', data: response.data });
    } catch (error) {
        console.error('STK Push Error:', error.response.data);
        res.json({ success: false, message: 'STK Push Failed', error: error.response.data });
    }
};
export const mpesaCallback = (req, res) => {
    console.log('MPesa Callback:', req.body);

    const body = req.body?.Body;

    if (body && body.stkCallback) {
        const { ResultCode, ResultDesc, CallbackMetadata } = body.stkCallback;

        if (ResultCode === 0) {
            console.log('✅ Payment Successful:', CallbackMetadata);
            // Optionally: update the DB with payment status
        } else {
            console.log('❌ Payment Failed:', ResultDesc);
        }

        res.status(200).json({ message: 'Callback received' });
    } else {
        console.error('⚠️ Invalid callback structure:', req.body);
        res.status(400).json({ message: 'Invalid callback structure' });
    }
};


// placing order using Razorpay Method
const placeOrderRazorpay = async (req,res) =>{
    try {
        const {userId,items,amount,address} = req.body;
        const orderData = {
            userId, 
            items,
            MPESA_CALLBACK_URL,
            address,
            amount,
            paymentMethod:"Razorpay",
            payment:false,
            date:Date.now()
        }
        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: amount * 135,
            currency:currency.toUpperCase(),
            receipt: newOrder._id.toString(),
        }
        await razorpayInstance.orders.create(options,(error,order)=>{
            if (error) {
                console.log(error);
                return res.json({success:false,message:error})
            }
            res.json({success:true,order})
        })
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

const VerifyRazorpay = async (req,res) =>{
    try {
        const {userId,razorpay_order_id} = req.body
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
        if (orderInfo.status === 'paid') {
            await orderModel.findByIdAndUpdate(orderInfo.receipt,{payment:true});
            await userModel.findByIdAndUpdate(userId,{cartData:{}})
            res.json({success:true,message: 'Payment Succefully'})
        }else{
            res.json({success:false,message:'payment failed'})
        }
        
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}
// All orders for admin panel
const allOrders = async (req,res) =>{
    try {
        const orders = await orderModel.find({})
        res.json({success:true,orders})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}
// All orders for frontend 
const userOrders = async (req,res) =>{
    try {
        const {userId} = req.body
        const orders = await orderModel.find({ userId })
        res.json({success:true,orders})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}
//update order status from admin panel
const updateStatus = async (req,res) =>{
    try {
        const { orderId,status} = req.body
        await orderModel.findByIdAndUpdate(orderId,{ status })
        res.json({success:true,message:'status updated'})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}
export {VerifyRazorpay,verifyStripe,placeOrder,placeOrderStripe,placeOrderRazorpay,allOrders,userOrders,updateStatus}