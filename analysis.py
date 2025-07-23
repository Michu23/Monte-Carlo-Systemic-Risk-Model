"""
Functions for analyzing and summarizing results
"""

import numpy as np
import pandas as pd
from scipy import stats
import config

def summarize_results(results):
    """
    Summarize the simulation results
    
    Parameters:
    results (list): List of tuples (number of failures, systemic event boolean, failed banks)
    
    Returns:
    dict: Summary statistics
    """
    failures = [r[0] for r in results]
    systemic_events = [r[1] for r in results]
    
    return {
        'Average Failures': np.mean(failures),
        'Max Failures': np.max(failures),
        'Std Dev Failures': np.std(failures),
        'Probability Systemic Event': np.mean(systemic_events)
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
        'Average Failures': (1 - bc_summary['Average Failures'] / trad_summary['Average Failures']) * 100 
            if trad_summary['Average Failures'] > 0 else 0,
        'Max Failures': trad_summary['Max Failures'] - bc_summary['Max Failures'],
        'Probability Systemic Event': (1 - bc_summary['Probability Systemic Event'] / trad_summary['Probability Systemic Event']) * 100 
            if trad_summary['Probability Systemic Event'] > 0 else 0,
        'Std Dev Failures': (1 - bc_summary['Std Dev Failures'] / trad_summary['Std Dev Failures']) * 100 
            if trad_summary['Std Dev Failures'] > 0 else 0
    }

def create_results_table(trad_summary, bc_summary, improvements):
    """
    Create a results table comparing traditional and blockchain systems
    
    Parameters:
    trad_summary (dict): Summary statistics for traditional banking
    bc_summary (dict): Summary statistics for blockchain banking
    improvements (dict): Improvement metrics
    
    Returns:
    pandas.DataFrame: Results table
    """
    return pd.DataFrame({
        'Metric': ['Average Failures', 'Maximum Failures', 
                  'Std Dev Failures', 'Probability Systemic Event (%)'],
        'Traditional': [
            f"{trad_summary['Average Failures']:.4f}",
            f"{trad_summary['Max Failures']:.0f}",
            f"{trad_summary['Std Dev Failures']:.4f}",
            f"{trad_summary['Probability Systemic Event']*100:.4f}%"
        ],
        'Blockchain': [
            f"{bc_summary['Average Failures']:.4f}",
            f"{bc_summary['Max Failures']:.0f}",
            f"{bc_summary['Std Dev Failures']:.4f}",
            f"{bc_summary['Probability Systemic Event']*100:.4f}%"
        ],
        'Improvement': [
            f"{improvements['Average Failures']:.2f}% reduction" if improvements['Average Failures'] > 0 else "No improvement",
            f"{improvements['Max Failures']:.0f} fewer failures" if improvements['Max Failures'] > 0 else "No improvement",
            f"{improvements['Std Dev Failures']:.2f}% lower volatility" if improvements['Std Dev Failures'] > 0 else "No improvement",
            f"{improvements['Probability Systemic Event']:.2f}% lower probability" if improvements['Probability Systemic Event'] > 0 else "No improvement"
        ]
    })

def perform_statistical_analysis(trad_results, bc_results):
    """
    Perform statistical analysis on simulation results
    
    Parameters:
    trad_results (list): Results from traditional banking simulation
    bc_results (list): Results from blockchain banking simulation
    
    Returns:
    tuple: (t_statistic, p_value, cohens_d, effect_interpretation)
    """
    trad_failures = [r[0] for r in trad_results]
    bc_failures = [r[0] for r in bc_results]
    
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