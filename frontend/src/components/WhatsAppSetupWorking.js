import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppSetupWorking = () => {
  const [status, setStatus] = useState({ loading: true, connected: false });
  const [qrCode, setQrCode] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    loadWhatsAppData();
    const interval = setInterval(loadWhatsAppData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadWhatsAppData = async () => {
    try {
      console.log('Loading WhatsApp data...');
      
      const statusRes = await axios.get(`${API}/whatsapp/status`);
      const qrRes = await axios.get(`${API}/whatsapp/qr`);
      
      console.log('WhatsApp status:', statusRes.data);
      console.log('QR available:', !!qrRes.data.qr);
      
      setStatus({
        loading: false,
        connected: statusRes.data.connected || false,
        connection_state: statusRes.data.connection_state
      });
      
      setQrCode(qrRes.data.qr);
    } catch (error) {
      console.error('Error loading WhatsApp data:', error);
      setStatus({ loading: false, connected: false, error: true });
    }
  };

  return (
    <div className="space-y-6 bg-blue-50 p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-800">WhatsApp Integration (Working Version)</h3>
      
      {/* Status Section */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium mb-2">Connection Status</h4>
        {status.loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : status.connected ? (
          <p className="text-green-600 font-medium">✅ WhatsApp Connected</p>
        ) : status.error ? (
          <p className="text-red-600 font-medium">❌ Service Error</p>
        ) : (
          <p className="text-orange-600 font-medium">🔄 WhatsApp Not Connected</p>
        )}
      </div>

      {/* QR Code Section */}
      {!status.connected && qrCode && !status.loading && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="font-medium mb-4 text-center">Scan QR Code with WhatsApp</h4>
          <div className="flex justify-center">
            <div className="bg-white p-4 border-2 border-gray-300 rounded-lg">
              <img 
                src={qrCode}
                alt="WhatsApp QR Code"
                className="w-64 h-64"
                onLoad={() => console.log('QR code image loaded successfully')}
                onError={(e) => console.error('QR code failed to load:', e)}
              />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600 text-center space-y-1">
            <p>1. Open WhatsApp on your phone</p>
            <p>2. Go to Settings → Linked Devices</p>
            <p>3. Tap "Link a Device"</p>
            <p>4. Scan this QR code</p>
          </div>
        </div>
      )}

      {/* Phone Setup Section */}
      {status.connected && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-2">🎉 WhatsApp Connected!</h4>
          <p className="text-green-700">You can now set up your phone number and preferences.</p>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Your phone number (+1234567890)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Complete Setup
            </button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
        Status: {JSON.stringify(status)}<br/>
        QR Length: {qrCode ? qrCode.length : 0}
      </div>
    </div>
  );
};

export default WhatsAppSetupWorking;