"""
Monte Carlo simulation functions
"""

import numpy as np
import config

def monte_carlo_sim(data, exposure_matrix, lgd, shock_prob, n_sim=10000, model_type="Traditional"):
    """
    Run Monte Carlo simulation for systemic risk assessment
    
    Parameters:
    data (DataFrame): Bank data including capital buffers
    exposure_matrix (numpy.ndarray): Matrix of interbank exposures
    lgd (float): Loss Given Default (percentage as decimal)
    shock_prob (float): Initial shock probability
    n_sim (int): Number of simulations to run
    model_type (str): "Traditional" or "Blockchain" - affects contagion dynamics
    
    Returns:
    list: List of tuples (number of failures, systemic event boolean, failed banks)
    """
    n_banks = len(data)
    failures_record = []
    
    # Set random seed for reproducibility - use different seeds for different models
    if model_type == "Traditional":
        np.random.seed(config.TRAD_SEED)
    else:
        np.random.seed(config.BC_SEED)
    
    # Adjust shock probability based on model type
    # Blockchain has better early warning systems, so initial shocks are less likely
    effective_shock_prob = shock_prob
    if model_type == "Blockchain":
        effective_shock_prob = shock_prob * config.BC_SHOCK_REDUCTION
    
    for sim in range(n_sim):
        # Progress indicator
        if sim % 1000 == 0 and sim > 0:
            print(f"Completed {sim} simulations...")
        
        # Step 1: Initial shock
        failed = np.random.rand(n_banks) < effective_shock_prob
        capital = data['Capital Buffer (€B)'].copy()
        
        # Track which banks failed in each round
        failed_in_round = {0: np.where(failed)[0].tolist()}
        round_num = 1
        
        # For blockchain, add additional capital buffer due to better risk management
        if model_type == "Blockchain":
            capital = capital * config.BC_CAPITAL_INCREASE
        
        still_failing = True
        while still_failing:
            losses = np.zeros(n_banks)
            # For each failed bank, distribute losses
            for i, is_failed in enumerate(failed):
                if is_failed:
                    # Apply the exposure matrix with LGD
                    current_losses = exposure_matrix[i] * lgd
                    
                    # For blockchain model, add additional risk mitigation factors
                    if model_type == "Blockchain":
                        # Blockchain has better transparency and early warning systems
                        # This reduces the contagion effect
                        current_losses *= config.BC_CONTAGION_REDUCTION
                    
                    losses += current_losses
            
            # In traditional banking, there's a chance of market panic amplifying losses
            if model_type == "Traditional" and round_num > 1:
                # Market panic factor increases with each round
                panic_factor = 1.0 + (round_num * config.TRAD_PANIC_FACTOR)
                losses = losses * panic_factor
            
            # Update capital buffer and check for new failures
            new_failed = (losses > capital.values) & (~failed)
            
            # Record which banks failed in this round
            if np.any(new_failed):
                failed_in_round[round_num] = np.where(new_failed)[0].tolist()
            
            still_failing = np.any(new_failed)
            failed = failed | new_failed
            
            # Reduce capital by losses
            capital = capital - losses
            
            round_num += 1
            
            # Safety check - shouldn't need more than 10 rounds
            if round_num > 10:
                break
        
        # Record results
        n_failures = np.sum(failed)
        systemic_event = n_failures >= config.SYSTEMIC_THRESHOLD
        
        # Record which banks failed
        failed_banks = np.where(failed)[0].tolist()
        
        failures_record.append((n_failures, systemic_event, failed_banks, failed_in_round))
    
    return failures_record