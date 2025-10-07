import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { MessageCircle, Phone, Clock, Heart, Smartphone, QrCode, CheckCircle, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppSetup = () => {
  const [whatsappStatus, setWhatsappStatus] = useState({ connected: false, loading: true });
  const [qrCode, setQrCode] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [settings, setSettings] = useState({
    daily_morning_message: true,
    morning_time: '09:00',
    welfare_check_days: 3,
    custom_morning_message: ''
  });
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkWhatsAppStatus = async () => {
    try {
      console.log('Checking WhatsApp status...');
      const statusResponse = await axios.get(`${API}/whatsapp/status`);
      console.log('Status response:', statusResponse.data);
      
      const qrResponse = await axios.get(`${API}/whatsapp/qr`);
      console.log('QR response:', qrResponse.data);
      
      setWhatsappStatus({
        ...statusResponse.data,
        loading: false
      });
      
      setQrCode(qrResponse.data.qr);
      console.log('QR Code set:', qrResponse.data.qr ? 'Available' : 'Not available');
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error);
      setWhatsappStatus({
        connected: false,
        loading: false,
        error: 'WhatsApp service unavailable'
      });
    }
  };

  const setupWhatsAppIntegration = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsSettingUp(true);
    try {
      await axios.post(`${API}/whatsapp/setup`, {
        phone_number: phoneNumber,
        ...settings
      });
      
      setSetupComplete(true);
      toast.success('WhatsApp integration set up successfully! 🎉');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set up WhatsApp integration');
    } finally {
      setIsSettingUp(false);
    }
  };

  const sendTestWelfareCheck = async () => {
    try {
      await axios.post(`${API}/whatsapp/send-welfare-check`);
      toast.success('Test welfare check sent to your WhatsApp! 📱');
    } catch (error) {
      toast.error('Failed to send test message');
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Add country code if not present
    if (digits.length > 0 && !digits.startsWith('1') && digits.length === 10) {
      return '+1' + digits;
    } else if (digits.length > 0 && !digits.startsWith('+')) {
      return '+' + digits;
    }
    return digits.length > 0 ? '+' + digits : '';
  };

  // Debug logging
  console.log('WhatsApp Component Render State:', {
    connected: whatsappStatus.connected,
    loading: whatsappStatus.loading,
    qrCodeExists: !!qrCode,
    qrCodeLength: qrCode ? qrCode.length : 0,
    connectionState: whatsappStatus.connection_state
  });

  return (
    <div className="space-y-6">
      {/* WhatsApp Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-6 h-6 text-green-600" />
            <span>WhatsApp Integration Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            {whatsappStatus.loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-gray-600">Checking connection...</span>
              </>
            ) : whatsappStatus.connected ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-600 font-medium">WhatsApp Connected</span>
                <Badge className="bg-green-100 text-green-800">Ready</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <span className="text-orange-600 font-medium">WhatsApp Not Connected</span>
                <Badge className="bg-orange-100 text-orange-800">Setup Required</Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debug: Force show QR section */}
      {qrCode && (
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
          <p className="text-sm text-yellow-800">DEBUG: QR Code should show here. Connected: {whatsappStatus.connected.toString()}, QR exists: {!!qrCode}</p>
        </div>
      )}

      {/* QR Code Section */}
      {!whatsappStatus.connected && qrCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="w-6 h-6" />
              <span>Connect WhatsApp</span>
            </CardTitle>
            <CardDescription>
              Scan this QR code with WhatsApp to connect your AI companion
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-white p-4 rounded-lg inline-block border-2 border-gray-200">
              <img 
                src={qrCode} 
                alt="WhatsApp QR Code"
                className="w-48 h-48"
                onError={(e) => {
                  console.error('QR Code image failed to load:', e)
                }}
              />
            </div>
            <div className="mt-4 text-sm text-gray-600 space-y-2">
              <p>1. Open WhatsApp on your phone</p>
              <p>2. Tap Menu → Linked Devices</p>
              <p>3. Tap "Link a Device"</p>
              <p>4. Scan this QR code</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Form */}
      {whatsappStatus.connected && !setupComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="w-6 h-6" />
              <span>Configure WhatsApp Features</span>
            </CardTitle>
            <CardDescription>
              Set up your phone number and preferences for WhatsApp integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="+1 555 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter the phone number connected to WhatsApp (include country code)
              </p>
            </div>

            <Separator />

            {/* Daily Morning Messages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-900">Daily Good Morning Messages</h4>
                  <p className="text-xs text-gray-500">Receive personalized morning messages</p>
                </div>
                <Switch
                  checked={settings.daily_morning_message}
                  onCheckedChange={(checked) => 
                    setSettings({...settings, daily_morning_message: checked})
                  }
                />
              </div>

              {settings.daily_morning_message && (
                <div className="ml-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Morning Message Time</label>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <Select 
                        value={settings.morning_time}
                        onValueChange={(value) => setSettings({...settings, morning_time: value})}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="07:00">7:00 AM</SelectItem>
                          <SelectItem value="08:00">8:00 AM</SelectItem>
                          <SelectItem value="09:00">9:00 AM</SelectItem>
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Custom Morning Message (Optional)</label>
                    <Input
                      placeholder="Good morning! Ready to tackle the day together?"
                      value={settings.custom_morning_message}
                      onChange={(e) => setSettings({...settings, custom_morning_message: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Welfare Check Settings */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                  <Heart className="w-4 h-4" />
                  <span>Emotional Welfare Checks</span>
                </h4>
                <p className="text-xs text-gray-500">I'll check on you if you haven't been active</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600">Check after days of inactivity</label>
                <Select 
                  value={settings.welfare_check_days.toString()}
                  onValueChange={(value) => setSettings({...settings, welfare_check_days: parseInt(value)})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="2">2 days</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={setupWhatsAppIntegration}
              disabled={isSettingUp || !phoneNumber.trim()}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSettingUp ? 'Setting Up...' : 'Complete WhatsApp Setup'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {setupComplete && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold text-green-800">WhatsApp Integration Complete! 🎉</h3>
              <p className="text-green-700">
                Your AI companion is now connected to WhatsApp. You can chat with me directly 
                and I'll send you personalized messages and check-ins!
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  onClick={sendTestWelfareCheck}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Send Test Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppSetup;