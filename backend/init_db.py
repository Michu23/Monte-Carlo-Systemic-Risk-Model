"""
Database initialization script
"""

import os
import pandas as pd
from app import create_app, db
from models.user import User
from models.bank import Bank
from werkzeug.security import generate_password_hash

def init_db():
    """Initialize the database with default data"""
    app = create_app()
    
    with app.app_context():
        # Create tables
        db.create_all()
        
        # Check if admin user exists
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
            print("Admin user created.")
        
        # Check if banks exist
        if Bank.query.count() == 0:
            print("Loading bank data...")
            try:
                # Try to load from CSV file
                data = pd.read_csv('banks_data.csv')
                
                for _, row in data.iterrows():
                    bank = Bank(
                        name=row['Bank Name'],
                        cet1_ratio=row['CET1 Ratio (%)'],
                        total_assets=row['Total Assets (€B)'],
                        interbank_assets=row['Interbank Assets (€B)'],
                        interbank_liabilities=row['Interbank Liabilities (€B)']
                    )
                    
                    # Calculate capital buffer if not in data
                    if 'Capital Buffer (€B)' in row:
                        bank.capital_buffer = row['Capital Buffer (€B)']
                    else:
                        bank.capital_buffer = bank.cet1_ratio * bank.total_assets * 0.01
                    
                    db.session.add(bank)
                
                db.session.commit()
                print(f"Loaded {len(data)} banks.")
            except Exception as e:
                print(f"Error loading bank data: {str(e)}")
        
        print("Database initialization complete.")

if __name__ == '__main__':
    init_db()