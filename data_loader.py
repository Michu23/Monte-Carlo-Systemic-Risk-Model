"""
Functions for loading data and exposure matrices
"""

import pandas as pd
import numpy as np
import config

def load_bank_data():
    """
    Load bank data from CSV file
    
    Returns:
    pandas.DataFrame: Bank data
    """
    data = pd.read_csv(config.BANK_DATA_FILE)
    
    # Calculate capital buffers if not already in the data
    if 'Capital Buffer (€B)' not in data.columns:
        data['Capital Buffer (€B)'] = data['CET1 Ratio (%)'] * data['Total Assets (€B)'] * 0.01
    
    return data

def load_exposure_matrix(file_path, bank_names=None):
    """
    Load the interbank exposure matrix from an external file
    
    Parameters:
    file_path (str): Path to the CSV file containing the exposure matrix
    bank_names (list): List of bank names for validation
    
    Returns:
    numpy.ndarray: Exposure matrix where [i,j] represents bank i's exposure to bank j
    """
    try:
        # Try to load the exposure matrix from the CSV file
        exposure_df = pd.read_csv(file_path)
        print(f"Successfully loaded exposure matrix from {file_path}")
        
        # Skip the header row if it contains bank names
        if bank_names is not None and exposure_df.columns[0] in bank_names:
            exposure_matrix = exposure_df.values
        else:
            exposure_matrix = exposure_df.values
            
        return exposure_matrix
    except FileNotFoundError:
        print(f"Warning: {file_path} not found. Will calculate exposure matrix instead.")
        return None

def save_exposure_matrix(matrix, bank_names, file_path):
    """
    Save exposure matrix to CSV file
    
    Parameters:
    matrix (numpy.ndarray): Exposure matrix
    bank_names (list): List of bank names
    file_path (str): Path to save the CSV file
    """
    pd.DataFrame(
        matrix, 
        columns=bank_names, 
        index=bank_names
    ).to_csv(file_path)
    print(f"Saved matrix to '{file_path}'")