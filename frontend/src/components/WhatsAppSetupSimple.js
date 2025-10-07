import React, { useState, useEffect } from 'react';

const WhatsAppSetupSimple = () => {
  const [testState, setTestState] = useState('loading...');

  useEffect(() => {
    setTestState('Component loaded successfully!');
  }, []);

  return (
    <div className="p-4 bg-blue-100 border border-blue-400 rounded">
      <h3 className="font-bold text-blue-800">Simple WhatsApp Test</h3>
      <p className="text-blue-700">{testState}</p>
      <div className="mt-4 p-4 bg-white rounded border">
        <h4>QR Code Section (Test)</h4>
        <div className="w-48 h-48 bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center">
          <p className="text-gray-500">QR Code placeholder</p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSetupSimple;