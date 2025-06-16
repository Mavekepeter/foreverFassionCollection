import React, { useState, useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const MpesaPayment = () => {
  const { token, backendUrl } = useContext(ShopContext);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async () => {
    if (!phone || !amount) {
      toast.error('Please enter phone number and amount');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/mpesa/stkpush`,
        { phone, amount },
        { headers: { token } }
      );

      if (data.success) {
        toast.success('Payment request sent to your phone. Please confirm.');
        navigate('/orders');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('Payment failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold text-center mb-4">Pay with MPesa</h2>
        
        <label className="block text-sm font-medium text-gray-700">Phone Number:</label>
        <input
          type="text"
          placeholder="2547XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 border rounded-md mb-4 focus:ring focus:ring-indigo-300"
        />

        <label className="block text-sm font-medium text-gray-700">Amount:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border rounded-md mb-4 focus:ring focus:ring-indigo-300"
        >  
        </input>

        <button
          onClick={handlePayment}
          disabled={loading}
          className={`w-full py-2 text-white bg-green-600 hover:bg-green-700 rounded-md transition flex items-center justify-center ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 mr-2 border-4 border-white border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
          ) : null}
          {loading ? 'Processing...' : 'Pay with MPesa'}
        </button>
      </div>
    </div>
  );
};

export default MpesaPayment;
