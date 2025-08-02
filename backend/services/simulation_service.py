"""
Simulation service for running Monte Carlo simulations
"""

import numpy as np
import pandas as pd
from scipy import stats
import time
import json
from celery import Celery
from flask import current_app
from backend.app import db
from backend.models.simulation import Simulation, SimulationResult
from backend.models.bank import Bank

# Initialize Celery
celery = Celery(__name__)

@celery.task
def run_simulation(simulation_id):
    """
    Run a Monte Carlo simulation asynchronously
    
    Args:
        simulation_id (str): ID of the simulation to run
    """
    # Create Flask app context
    from backend.app import create_app
    app = create_app()
    
    with app.app_context():
        try:
            # Get simulation from database
            simulation = Simulation.query.get(simulation_id)
            
            if not simulation:
                return {"error": "Simulation not found"}
            
            # Update status to running
            simulation.status = 'running'
            simulation.progress = 0.0
            db.session.commit()
            
            # Get parameters
            params = simulation.parameters
            
            # Validate parameters
            validation_error = validate_parameters(params)
            if validation_error:
                simulation.status = 'failed'
                simulation.error_message = validation_error
                db.session.commit()
                return {"error": validation_error}
            
            # Get bank data
            banks = Bank.query.all()
            if not banks:
                simulation.status = 'failed'
                simulation.error_message = "No bank data available"
                db.session.commit()
                return {"error": "No bank data available"}
            
            # Convert to pandas DataFrame
            data = pd.DataFrame([{
                'Bank Name': bank.name,
                'CET1 Ratio (%)': bank.cet1_ratio,
                'Total Assets (€B)': bank.total_assets,
                'Interbank Assets (€B)': bank.interbank_assets,
                'Interbank Liabilities (€B)': bank.interbank_liabilities,
                'Capital Buffer (€B)': bank.capital_buffer
            } for bank in banks])
            
            # Build exposure matrices
            update_progress(simulation_id, 0.1, "Building exposure matrices")
            
            trad_exposure = build_exposure_matrix(
                data['Interbank Assets (€B)'], 
                data['Interbank Liabilities (€B)']
            )
            
            bc_exposure = trad_exposure * params['bc_liability_reduction']
            
            # Run traditional banking simulation
            update_progress(simulation_id, 0.2, "Running traditional banking simulation")
            
            trad_results = monte_carlo_sim(
                data, 
                trad_exposure, 
                lgd=params['trad_lgd'], 
                shock_prob=params['shock_prob'], 
                n_sim=params['n_sim'],
                systemic_threshold=params['systemic_threshold'],
                model_type="Traditional",
                progress_callback=lambda p, m: update_progress(simulation_id, 0.2 + p * 0.3, m)
            )
            
            # Run blockchain banking simulation
            update_progress(simulation_id, 0.5, "Running blockchain banking simulation")
            
            bc_results = monte_carlo_sim(
                data, 
                bc_exposure, 
                lgd=params['bc_lgd'], 
                shock_prob=params['shock_prob'], 
                n_sim=params['n_sim'],
                systemic_threshold=params['systemic_threshold'],
                model_type="Blockchain",
                progress_callback=lambda p, m: update_progress(simulation_id, 0.5 + p * 0.3, m)
            )
            
            # Analyze results
            update_progress(simulation_id, 0.8, "Analyzing results")
            
            trad_summary = summarize_results(trad_results, params['systemic_threshold'])
            bc_summary = summarize_results(bc_results, params['systemic_threshold'])
            improvements = calculate_improvements(trad_summary, bc_summary)
            
            # Statistical analysis
            trad_failures = [r[0] for r in trad_results]
            bc_failures = [r[0] for r in bc_results]
            
            t_stat, p_value, cohens_d, effect = perform_statistical_analysis(trad_failures, bc_failures)
            
            # Create result object
            update_progress(simulation_id, 0.9, "Saving results")
            
            # Check if result already exists
            existing_result = SimulationResult.query.filter_by(simulation_id=simulation_id).first()
            if existing_result:
                db.session.delete(existing_result)
                db.session.commit()
            
            result = SimulationResult(
                simulation_id=simulation_id,
                traditional_summary=trad_summary,
                blockchain_summary=bc_summary,
                improvements=improvements,
                statistical_analysis={
                    't_stat': float(t_stat),
                    'p_value': float(p_value),
                    'cohens_d': float(cohens_d),
                    'effect': effect,
                    'significant': bool(p_value < 0.05)
                },
                raw_data={
                    'traditional_failures': trad_failures[:1000],  # Limit to first 1000 for size
                    'blockchain_failures': bc_failures[:1000],
                    'bank_names': data['Bank Name'].tolist()
                }
            )
            
            db.session.add(result)
            
            # Update simulation status
            simulation.status = 'completed'
            simulation.progress = 1.0
            simulation.error_message = None
            db.session.commit()
            
            return {"status": "success"}
        
        except Exception as e:
            # Update simulation status to failed
            try:
                simulation = Simulation.query.get(simulation_id)
                if simulation:
                    simulation.status = 'failed'
                    simulation.error_message = str(e)
                    db.session.commit()
            except:
                pass
            
            # Log error
            current_app.logger.error(f"Simulation {simulation_id} failed: {str(e)}")
            return {"error": str(e)}

def run_simulation_sync(simulation_id):
    """
    Run a Monte Carlo simulation synchronously (for development/testing)
    
    Args:
        simulation_id (str): ID of the simulation to run
    """
    try:
        # Get simulation from database
        simulation = Simulation.query.get(simulation_id)
        
        if not simulation:
            return {"error": "Simulation not found"}
        
        # Update status to running
        simulation.status = 'running'
        simulation.progress = 0.0
        db.session.commit()
        
        # Get parameters
        params = simulation.parameters
        
        # Validate parameters
        validation_error = validate_parameters(params)
        if validation_error:
            simulation.status = 'failed'
            simulation.error_message = validation_error
            db.session.commit()
            return {"error": validation_error}
        
        # Get bank data
        banks = Bank.query.all()
        if not banks:
            simulation.status = 'failed'
            simulation.error_message = "No bank data available"
            db.session.commit()
            return {"error": "No bank data available"}
        
        # Convert to pandas DataFrame
        data = pd.DataFrame([{
            'Bank Name': bank.name,
            'CET1 Ratio (%)': bank.cet1_ratio,
            'Total Assets (€B)': bank.total_assets,
            'Interbank Assets (€B)': bank.interbank_assets,
            'Interbank Liabilities (€B)': bank.interbank_liabilities,
            'Capital Buffer (€B)': bank.capital_buffer
        } for bank in banks])
        
        # Build exposure matrices
        simulation.progress = 0.1
        simulation.status_message = "Building exposure matrices"
        db.session.commit()
        
        trad_exposure = build_exposure_matrix(
            data['Interbank Assets (€B)'], 
            data['Interbank Liabilities (€B)']
        )
        
        bc_exposure = trad_exposure * params['bc_liability_reduction']
        
        # Run traditional banking simulation
        simulation.progress = 0.2
        simulation.status_message = "Running traditional banking simulation"
        db.session.commit()
        
        # Use smaller number of simulations for faster synchronous execution
        n_sim = min(params['n_sim'], 1000)  # Limit to 1000 for sync execution
        
        trad_results = monte_carlo_sim(
            data, 
            trad_exposure, 
            lgd=params['trad_lgd'], 
            shock_prob=params['shock_prob'], 
            n_sim=n_sim,
            systemic_threshold=params['systemic_threshold'],
            model_type="Traditional"
        )
        
        # Run blockchain banking simulation
        simulation.progress = 0.5
        simulation.status_message = "Running blockchain banking simulation"
        db.session.commit()
        
        bc_results = monte_carlo_sim(
            data, 
            bc_exposure, 
            lgd=params['bc_lgd'], 
            shock_prob=params['shock_prob'], 
            n_sim=n_sim,
            systemic_threshold=params['systemic_threshold'],
            model_type="Blockchain"
        )
        
        # Analyze results
        simulation.progress = 0.8
        simulation.status_message = "Analyzing results"
        db.session.commit()
        
        trad_summary = summarize_results(trad_results, params['systemic_threshold'])
        bc_summary = summarize_results(bc_results, params['systemic_threshold'])
        improvements = calculate_improvements(trad_summary, bc_summary)
        
        # Statistical analysis
        trad_failures = [r[0] for r in trad_results]
        bc_failures = [r[0] for r in bc_results]
        
        t_stat, p_value, cohens_d, effect = perform_statistical_analysis(trad_failures, bc_failures)
        
        # Create result object
        simulation.progress = 0.9
        simulation.status_message = "Saving results"
        db.session.commit()
        
        # Check if result already exists
        existing_result = SimulationResult.query.filter_by(simulation_id=simulation_id).first()
        if existing_result:
            db.session.delete(existing_result)
            db.session.commit()
        
        result = SimulationResult(
            simulation_id=simulation_id,
            traditional_summary=trad_summary,
            blockchain_summary=bc_summary,
            improvements=improvements,
            statistical_analysis={
                't_stat': float(t_stat),
                'p_value': float(p_value),
                'cohens_d': float(cohens_d),
                'effect': effect,
                'significant': bool(p_value < 0.05)
            },
            raw_data={
                'traditional_failures': trad_failures[:1000],  # Limit to first 1000 for size
                'blockchain_failures': bc_failures[:1000],
                'bank_names': data['Bank Name'].tolist()
            }
        )
        
        db.session.add(result)
        
        # Update simulation status
        simulation.status = 'completed'
        simulation.progress = 1.0
        simulation.error_message = None
        simulation.status_message = "Completed"
        db.session.commit()
        
        return {"status": "success"}
    
    except Exception as e:
        # Update simulation status to failed
        try:
            simulation = Simulation.query.get(simulation_id)
            if simulation:
                simulation.status = 'failed'
                simulation.error_message = str(e)
                db.session.commit()
        except:
            pass
        
        return {"error": str(e)}

def validate_parameters(params):
    """
    Validate simulation parameters
    
    Args:
        params (dict): Simulation parameters
        
    Returns:
        str: Error message if validation fails, None otherwise
    """
    required_params = ['shock_prob', 'n_sim', 'systemic_threshold', 'trad_lgd', 'bc_lgd', 'bc_liability_reduction']
    for param in required_params:
        if param not in params:
            return f"Missing required parameter: {param}"
    
    # Validate shock_prob
    if not 0 < params['shock_prob'] < 1:
        return "shock_prob must be between 0 and 1"
    
    # Validate n_sim
    if not isinstance(params['n_sim'], int) or params['n_sim'] < 100:
        return "n_sim must be an integer of at least 100"
    
    # Validate systemic_threshold
    if not isinstance(params['systemic_threshold'], int) or params['systemic_threshold'] < 1:
        return "systemic_threshold must be an integer of at least 1"
    
    # Validate trad_lgd
    if not 0 < params['trad_lgd'] < 1:
        return "trad_lgd must be between 0 and 1"
    
    # Validate bc_lgd
    if not 0 < params['bc_lgd'] < 1:
        return "bc_lgd must be between 0 and 1"
    
    # Validate bc_liability_reduction
    if not 0 < params['bc_liability_reduction'] < 1:
        return "bc_liability_reduction must be between 0 and 1"
    
    return None

def update_progress(simulation_id, progress, message=None):
    """
    Update simulation progress
    
    Args:
        simulation_id (str): ID of the simulation
        progress (float): Progress value between 0 and 1
        message (str): Optional status message
    """
    simulation = Simulation.query.get(simulation_id)
    if simulation:
        simulation.progress = progress
        if message:
            simulation.status_message = message
        db.session.commit()

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

def monte_carlo_sim(data, exposure_matrix, lgd, shock_prob, n_sim=10000, systemic_threshold=3, 
                   model_type="Traditional", progress_callback=None):
    """
    Run Monte Carlo simulation for systemic risk assessment
    
    Parameters:
    data (DataFrame): Bank data including capital buffers
    exposure_matrix (numpy.ndarray): Matrix of interbank exposures
    lgd (float): Loss Given Default (percentage as decimal)
    shock_prob (float): Initial shock probability
    n_sim (int): Number of simulations to run
    systemic_threshold (int): Number of bank failures to consider a systemic event
    model_type (str): "Traditional" or "Blockchain" - affects contagion dynamics
    progress_callback (function): Callback function for progress updates
    
    Returns:
    list: List of tuples (number of failures, systemic event boolean, failed banks)
    """
    n_banks = len(data)
    failures_record = []
    
    # Set random seed for reproducibility - use different seeds for different models
    if model_type == "Traditional":
        np.random.seed(42)
    else:
        np.random.seed(44)  # Different seed for blockchain to avoid identical results
    
    # Adjust shock probability based on model type
    # Blockchain has better early warning systems, so initial shocks are less likely
    effective_shock_prob = shock_prob
    if model_type == "Blockchain":
        effective_shock_prob = shock_prob * 0.8  # 20% reduction in initial shock probability
    
    for sim in range(n_sim):
        # Update progress every 100 simulations
        if progress_callback and sim % 100 == 0:
            progress_callback(sim / n_sim, f"Running {model_type} simulation {sim}/{n_sim}")
        
        # Step 1: Initial shock
        failed = np.random.rand(n_banks) < effective_shock_prob
        capital = data['Capital Buffer (€B)'].copy()
        
        # Track which banks failed in each round
        failed_in_round = {0: np.where(failed)[0].tolist()}
        round_num = 1
        
        # For blockchain, add additional capital buffer due to better risk management
        if model_type == "Blockchain":
            capital = capital * 1.1  # 10% increase in effective capital buffer
        
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
                        current_losses *= 0.6  # 40% reduction in contagion effect due to transparency
                    
                    losses += current_losses
            
            # In traditional banking, there's a chance of market panic amplifying losses
            if model_type == "Traditional" and round_num > 1:
                # Market panic factor increases with each round
                panic_factor = 1.0 + (round_num * 0.1)  # 10% increase per round
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
        systemic_event = n_failures >= systemic_threshold
        
        # Record which banks failed
        failed_banks = np.where(failed)[0].tolist()
        
        failures_record.append((n_failures, systemic_event, failed_banks, failed_in_round))
    
    # Final progress update
    if progress_callback:
        progress_callback(1.0, f"Completed {model_type} simulation")
    
    return failures_record

def summarize_results(results, systemic_threshold):
    """
    Summarize the simulation results
    
    Parameters:
    results (list): List of tuples (number of failures, systemic event boolean, failed banks)
    systemic_threshold (int): Number of bank failures to consider a systemic event
    
    Returns:
    dict: Summary statistics
    """
    failures = [r[0] for r in results]
    systemic_events = [r[1] for r in results]
    
    # Calculate 95% confidence intervals
    ci_lower, ci_upper = stats.norm.interval(
        0.95, 
        loc=np.mean(failures), 
        scale=stats.sem(failures)
    )
    
    # Calculate frequency distribution
    max_failures = max(failures)
    distribution = {}
    for i in range(max_failures + 1):
        distribution[str(i)] = failures.count(i) / len(failures) * 100
    
    # Calculate bank failure frequencies
    bank_failures = {}
    for result in results:
        for bank_idx in result[2]:  # result[2] contains the list of failed banks
            bank_failures[str(bank_idx)] = bank_failures.get(str(bank_idx), 0) + 1
    
    for bank_idx in bank_failures:
        bank_failures[bank_idx] = bank_failures[bank_idx] / len(results) * 100
    
    return {
        'average_failures': float(np.mean(failures)),
        'median_failures': float(np.median(failures)),
        'max_failures': int(np.max(failures)),
        'min_failures': int(np.min(failures)),
        'std_dev_failures': float(np.std(failures)),
        'probability_systemic_event': float(np.mean(systemic_events)),
        'ci_lower': float(ci_lower),
        'ci_upper': float(ci_upper),
        'distribution': distribution,
        'bank_failures': bank_failures,
        'systemic_threshold': systemic_threshold
    }

def calculate_improvements(trad_summary, bc_summary):
    """
    Calculate improvement percentages between traditional and blockchain systems
    
    Parameters:
    trad_summary (dict): Summary statistics for traditional banking
    bc_summary (dict): Summary statistics for blockchain banking
    
    Returns:
    dict: Improvement metrics
    """
    return {
        'average_failures': float((1 - bc_summary['average_failures'] / trad_summary['average_failures']) * 100) 
            if trad_summary['average_failures'] > 0 else 0.0,
        'max_failures': int(trad_summary['max_failures'] - bc_summary['max_failures']),
        'probability_systemic_event': float((1 - bc_summary['probability_systemic_event'] / trad_summary['probability_systemic_event']) * 100) 
            if trad_summary['probability_systemic_event'] > 0 else 0.0,
        'std_dev_failures': float((1 - bc_summary['std_dev_failures'] / trad_summary['std_dev_failures']) * 100) 
            if trad_summary['std_dev_failures'] > 0 else 0.0
    }

def perform_statistical_analysis(trad_failures, bc_failures):
    """
    Perform statistical analysis on simulation results
    
    Parameters:
    trad_failures (list): List of failures from traditional banking simulation
    bc_failures (list): List of failures from blockchain banking simulation
    
    Returns:
    tuple: (t_statistic, p_value, cohens_d, effect_interpretation)
    """
    # T-test
    t_stat, p_value = stats.ttest_ind(trad_failures, bc_failures)
    
    # Cohen's d for effect size
    mean_diff = np.mean(trad_failures) - np.mean(bc_failures)
    pooled_std = np.sqrt(((len(trad_failures) - 1) * np.var(trad_failures) + 
                         (len(bc_failures) - 1) * np.var(bc_failures)) / 
                        (len(trad_failures) + len(bc_failures) - 2))
    cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0
    
    # Interpret effect size
    if abs(cohens_d) < 0.5:
        effect = "Small"
    elif abs(cohens_d) < 0.8:
        effect = "Medium"
    else:
        effect = "Large"
    
    return t_stat, p_value, cohens_d, effect