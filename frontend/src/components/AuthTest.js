import React, { useState } from 'react';
import { authAPI } from '../services/api';

const AuthTest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testRegister = async () => {
    setLoading(true);
    try {
      const response = await authAPI.register({
        username: 'testuser' + Date.now(),
        email: 'test' + Date.now() + '@test.com',
        password: 'test123'
      });
      setResult('✅ Register Success: ' + JSON.stringify(response, null, 2));
    } catch (error) {
      setResult('❌ Register Error: ' + error.message);
    }
    setLoading(false);
  };

  const testUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/users/debug');
      const data = await response.json();
      setResult('👥 Users in DB: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('❌ Users Error: ' + error.message);
    }
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await authAPI.login({
        username: 'demo_user',
        password: 'demo123'
      });
      setResult('✅ Login Success: ' + JSON.stringify(response, null, 2));
    } catch (error) {
      setResult('❌ Login Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 Auth API Test</h1>
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testRegister} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Test Register
        </button>
        <button 
          onClick={testLogin} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Test Login (demo_user/demo123)
        </button>
        <button 
          onClick={testUsers} 
          disabled={loading}
          style={{ padding: '10px 20px' }}
        >
          Show Users in DB
        </button>
      </div>
      
      {loading && <div>⏳ Loading...</div>}
      
      <pre style={{ 
        background: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '5px',
        whiteSpace: 'pre-wrap'
      }}>
        {result || 'Click a button to test the API'}
      </pre>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>Backend: http://localhost:5001</p>
        <p>Frontend: http://localhost:3000</p>
        <p>Direct API calls (no proxy)</p>
      </div>
    </div>
  );
};

export default AuthTest;
