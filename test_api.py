#!/usr/bin/env python3
"""
Test script to verify the simulation API is working
"""

import requests
import json

# Test configuration
API_BASE_URL = "http://localhost:5001"

def test_health():
    """Test the health endpoint"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/health")
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_simulation_creation():
    """Test simulation creation"""
    simulation_data = {
        "name": "Test Simulation",
        "description": "Monte Carlo simulation with 1000 iterations",
        "parameters": {
            "shock_prob": 0.03,
            "n_sim": 1000,
            "systemic_threshold": 3,
            "trad_lgd": 0.6,
            "bc_lgd": 0.3,
            "bc_liability_reduction": 0.5
        }
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/simulations",
            json=simulation_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📡 Simulation creation response: {response.status_code}")
        print(f"📄 Response headers: {dict(response.headers)}")
        
        if response.content:
            try:
                response_data = response.json()
                print(f"📋 Response data: {json.dumps(response_data, indent=2)}")
            except json.JSONDecodeError:
                print(f"📋 Raw response: {response.text}")
        else:
            print("📋 Empty response")
            
        return response.status_code < 500
    except Exception as e:
        print(f"❌ Simulation creation failed: {e}")
        return False

def main():
    print("🧪 Testing Simulation API...")
    print("=" * 50)
    
    # Test health first
    if not test_health():
        print("❌ Server appears to be down")
        return
    
    # Test simulation creation
    test_simulation_creation()
    
    print("=" * 50)
    print("🏁 Test completed")

if __name__ == "__main__":
    main()
