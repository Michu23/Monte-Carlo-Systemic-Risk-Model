#!/usr/bin/env python3
"""
Quick database setup and test script
"""

import sys
import os
sys.path.append('/Users/mirasmujeeb/Desktop/Thesis/Nazu/Python/backend')

from backend.app import create_app, db
from backend.models.user import User
from backend.models.bank import Bank
from werkzeug.security import generate_password_hash
import pandas as pd

def setup_database():
    """Set up database with sample data"""
    app = create_app()
    
    with app.app_context():
        # Create tables
        print("Creating tables...")
        db.create_all()
        
        # Create admin user if not exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("Creating admin user...")
            admin = User(
                username='admin',
                email='admin@example.com',
                password_hash=generate_password_hash('admin123'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created (username: admin, password: admin123)")
        else:
            print("✅ Admin user already exists")
        
        # Create test user if not exists  
        test_user = User.query.filter_by(username='test').first()
        if not test_user:
            print("Creating test user...")
            test_user = User(
                username='test',
                email='test@example.com',
                password_hash=generate_password_hash('test123'),
                role='user'
            )
            db.session.add(test_user)
            db.session.commit()
            print("✅ Test user created (username: test, password: test123)")
        else:
            print("✅ Test user already exists")
        
        # Load bank data if not exists
        if Bank.query.count() == 0:
            print("Loading bank data...")
            try:
                # Read the bank data CSV
                data = pd.read_csv('/Users/mirasmujeeb/Desktop/Thesis/Nazu/Python/banks_data.csv')
                
                for _, row in data.iterrows():
                    bank = Bank(
                        name=row['Bank Name'],
                        cet1_ratio=row['CET1 Ratio (%)'],
                        total_assets=row['Total Assets (€B)'],
                        interbank_assets=row['Interbank Assets (€B)'],
                        interbank_liabilities=row['Interbank Liabilities (€B)'],
                        capital_buffer=row['Capital Buffer (€B)']
                    )
                    db.session.add(bank)
                
                db.session.commit()
                print(f"✅ Loaded {len(data)} banks")
            except Exception as e:
                print(f"❌ Error loading bank data: {e}")
        else:
            print(f"✅ Bank data already exists ({Bank.query.count()} banks)")
        
        # Print summary
        print("\n" + "="*50)
        print("DATABASE SETUP COMPLETE")
        print("="*50)
        print(f"Users: {User.query.count()}")
        print(f"Banks: {Bank.query.count()}")
        print("\nLogin credentials:")
        print("  Admin: username=admin, password=admin123")
        print("  Test:  username=test, password=test123")
        print("\nYou can now:")
        print("1. Start your backend server: python backend/app.py")
        print("2. Login to the frontend with the credentials above")
        print("3. Create and run simulations")

if __name__ == "__main__":
    setup_database()
