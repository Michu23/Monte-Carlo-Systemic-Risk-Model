"""
Functions for building and handling exposure matrices
"""

import numpy as np
import pandas as pd
import config
import data_loader

def build_exposure_matrix(assets, liabilities):
    """
    Build the interbank exposure matrix based on assets and liabilities
    
    Parameters:
    assets (array): Interbank assets for each bank
    liabilities (array): Interbank liabilities for each bank
    
    Returns:
    numpy.ndarray: Exposure matrix where [i,j] represents bank i's exposure to bank j
    """
    n = len(assets)
    matrix = np.zeros((n, n))
    total_assets = np.sum(assets)
    
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i, j] = liabilities[i] * assets[j] / (total_assets - assets[i])
    
    return matrix

def get_traditional_exposure_matrix(data, output_path=None):
    """
    Get the exposure matrix for traditional banking system
    
    Parameters:
    data (DataFrame): Bank data
    output_path (str): Path to save the calculated matrix
    
    Returns:
    numpy.ndarray: Exposure matrix for traditional banking
    """
    # Try to load from file first
    trad_exposure = data_loader.load_exposure_matrix(
        config.TRAD_EXPOSURE_FILE, 
        data['Bank Name'].values
    )
    
    # If file doesn't exist, calculate the matrix
    if trad_exposure is None:
        print("Calculating traditional exposure matrix...")
        trad_exposure = build_exposure_matrix(
            data['Interbank Assets (€B)'], 
            data['Interbank Liabilities (€B)']
        )
        
        # Save the calculated matrix for future use
        if output_path:
            data_loader.save_exposure_matrix(
                trad_exposure, 
                data['Bank Name'], 
                output_path
            )
    
    return trad_exposure

def get_blockchain_exposure_matrix(data, trad_exposure, output_path=None):
    """
    Get the exposure matrix for blockchain banking system
    
    Parameters:
    data (DataFrame): Bank data
    trad_exposure (numpy.ndarray): Traditional exposure matrix
    output_path (str): Path to save the calculated matrix
    
    Returns:
    numpy.ndarray: Exposure matrix for blockchain banking
    """
    # Try to load from file first
    bc_exposure = data_loader.load_exposure_matrix(
        config.BC_EXPOSURE_FILE, 
        data['Bank Name'].values
    )
    
    # If file doesn't exist, derive from traditional matrix
    if bc_exposure is None:
        print("Deriving blockchain exposure matrix from traditional matrix "
              f"({config.BC_LIABILITY_REDUCTION*100}% reduction)...")
        bc_exposure = trad_exposure * config.BC_LIABILITY_REDUCTION
        
        # Save the derived matrix for future use
        if output_path:
            data_loader.save_exposure_matrix(
                bc_exposure, 
                data['Bank Name'], 
                output_path
            )
    
    return bc_exposure