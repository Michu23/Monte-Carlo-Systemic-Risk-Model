"""
Functions for creating visualizations
"""

import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import config

def setup_visualization():
    """
    Set up visualization style
    """
    sns.set(style="whitegrid")

def create_failure_distribution_plot(trad_results, bc_results, trad_summary, bc_summary, output_path):
    """
    Create a figure with multiple plots showing failure distributions
    
    Parameters:
    trad_results (list): Results from traditional banking simulation
    bc_results (list): Results from blockchain banking simulation
    trad_summary (dict): Summary statistics for traditional banking
    bc_summary (dict): Summary statistics for blockchain banking
    output_path (str): Path to save the figure
    """
    trad_failures = [r[0] for r in trad_results]
    bc_failures = [r[0] for r in bc_results]
    
    plt.figure(figsize=(12, 8))
    
    # 1. Failure distribution histograms
    plt.subplot(2, 2, 1)
    sns.histplot(trad_failures, bins=range(max(max(trad_failures), max(bc_failures))+2), 
                alpha=0.7, label='Traditional', kde=True, color=config.TRAD_COLOR)
    sns.histplot(bc_failures, bins=range(max(max(trad_failures), max(bc_failures))+2), 
                alpha=0.7, label='Blockchain', kde=True, color=config.BC_COLOR)
    plt.xlabel('Number of Bank Failures')
    plt.ylabel('Frequency')
    plt.title('Distribution of Bank Failures')
    plt.legend()
    
    # 2. Cumulative probability chart
    plt.subplot(2, 2, 2)
    sns.ecdfplot(trad_failures, label='Traditional', color=config.TRAD_COLOR)
    sns.ecdfplot(bc_failures, label='Blockchain', color=config.BC_COLOR)
    plt.xlabel('Number of Bank Failures')
    plt.ylabel('Cumulative Probability')
    plt.title('Cumulative Probability of Bank Failures')
    plt.legend()
    
    # 3. Box plots
    plt.subplot(2, 2, 3)
    sns.boxplot(data=[trad_failures, bc_failures], width=0.5)
    plt.xticks([0, 1], ['Traditional', 'Blockchain'])
    plt.ylabel('Number of Bank Failures')
    plt.title('Box Plot Comparison')
    
    # 4. Bar chart of systemic event probability
    plt.subplot(2, 2, 4)
    systemic_probs = [trad_summary['Probability Systemic Event']*100, 
                     bc_summary['Probability Systemic Event']*100]
    plt.bar(['Traditional', 'Blockchain'], systemic_probs, 
            color=[config.TRAD_COLOR, config.BC_COLOR])
    plt.ylabel('Probability (%)')
    plt.title(f'Probability of Systemic Event (≥{config.SYSTEMIC_THRESHOLD} failures)')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()

def create_correlation_heatmaps(trad_results, bc_results, data, output_path):
    """
    Create heatmaps showing bank failure correlations
    
    Parameters:
    trad_results (list): Results from traditional banking simulation
    bc_results (list): Results from blockchain banking simulation
    data (DataFrame): Bank data
    output_path (str): Path to save the figure
    """
    n_sim = len(trad_results)
    
    plt.figure(figsize=(12, 10))
    
    # Extract which banks failed in each simulation for traditional banking
    bank_failures = np.zeros((n_sim, len(data)))
    for i, result in enumerate(trad_results):
        for bank_idx in result[2]:  # result[2] contains the list of failed banks
            bank_failures[i, bank_idx] = 1
    
    # Calculate correlation matrix
    failure_corr = np.corrcoef(bank_failures.T)
    
    plt.subplot(2, 1, 1)
    sns.heatmap(failure_corr, annot=True, cmap='coolwarm', 
                xticklabels=data['Bank Name'], yticklabels=data['Bank Name'])
    plt.title('Traditional Banking: Bank Failure Correlation Matrix')
    
    # Do the same for blockchain
    bank_failures_bc = np.zeros((n_sim, len(data)))
    for i, result in enumerate(bc_results):
        for bank_idx in result[2]:
            bank_failures_bc[i, bank_idx] = 1
    
    failure_corr_bc = np.corrcoef(bank_failures_bc.T)
    
    plt.subplot(2, 1, 2)
    sns.heatmap(failure_corr_bc, annot=True, cmap='coolwarm', 
                xticklabels=data['Bank Name'], yticklabels=data['Bank Name'])
    plt.title('Blockchain Banking: Bank Failure Correlation Matrix')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()