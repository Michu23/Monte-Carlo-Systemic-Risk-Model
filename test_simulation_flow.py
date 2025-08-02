#!/usr/bin/env python3
"""
Test the simulation creation and retrieval
"""

import requests
import json
import time

# Test configuration
API_BASE_URL = "http://localhost:5001"
USERNAME = "test"
PASSWORD = "test123"

def login():
    """Login and get JWT token"""
    try:
        response = requests.post(f"{API_BASE_URL}/api/auth/login", json={
            "username": USERNAME,
            "password": PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login successful")
            return data.get('token')
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_simulation_flow():
    """Test the complete simulation flow"""
    print("🧪 Testing complete simulation flow...")
    print("=" * 50)
    
    # Step 1: Login
    token = login()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Create simulation
    print("📝 Creating simulation...")
    simulation_data = {
        "name": "Test Simulation",
        "description": "Test simulation with 100 iterations",
        "parameters": {
            "shock_prob": 0.03,
            "n_sim": 100,  # Small number for quick testing
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
            headers=headers
        )
        
        print(f"📡 Create response: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            simulation_id = data['simulation']['id']
            print(f"✅ Simulation created: {simulation_id}")
            
            # Step 3: Wait a moment for processing
            print("⏳ Waiting for simulation to process...")
            time.sleep(2)
            
            # Step 4: Get simulation details
            print("📖 Fetching simulation details...")
            response = requests.get(
                f"{API_BASE_URL}/api/simulations/{simulation_id}",
                headers=headers
            )
            
            print(f"📡 Get response: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                sim = data['simulation']
                print(f"✅ Simulation retrieved:")
                print(f"   Status: {sim['status']}")
                print(f"   Progress: {sim['progress']}")
                if sim.get('error_message'):
                    print(f"   Error: {sim['error_message']}")
                
                # Step 5: Get results if completed
                if sim['status'] == 'completed':
                    print("📊 Fetching simulation results...")
                    response = requests.get(
                        f"{API_BASE_URL}/api/simulations/{simulation_id}/results",
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        results = response.json()
                        print("✅ Results retrieved successfully!")
                        print(f"   Traditional avg failures: {results['results']['traditional_summary']['average_failures']:.2f}")
                        print(f"   Blockchain avg failures: {results['results']['blockchain_summary']['average_failures']:.2f}")
                        print(f"   Improvement: {results['results']['improvements']['average_failures']:.1f}%")
                    else:
                        print(f"❌ Failed to get results: {response.status_code}")
                else:
                    print(f"⚠️  Simulation not completed yet (status: {sim['status']})")
                
            else:
                print(f"❌ Failed to get simulation: {response.status_code} - {response.text}")
                
        else:
            print(f"❌ Failed to create simulation: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error during simulation test: {e}")
    
    print("=" * 50)
    print("🏁 Test completed")

if __name__ == "__main__":
    test_simulation_flow()
