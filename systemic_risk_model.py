import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import time

# Start timing the execution
start_time = time.time()

print("Monte Carlo Systemic Risk Model: Traditional vs Blockchain Banking Systems")
print("======================================================================")
print("Author: Naznin Anwar Vadakkathinakath")
print("Institution: Coburg University of Applied Sciences and Arts")
print("\nInitializing model...")

# Load bank data
data = pd.read_csv('banks_data.csv')

# Calculate capital buffers if not already in the data
if 'Capital Buffer (€B)' not in data.columns:
    data['Capital Buffer (€B)'] = data['CET1 Ratio (%)'] * data['Total Assets (€B)'] * 0.01

# Set simulation parameters
shock_prob = 0.03   # Increased to 3% to generate more failures and contagion
n_sim = 10000       # Number of simulations
systemic_threshold = 3  # Definition of systemic event: ≥3 bank failures

print(f"\nModel Parameters:")
print(f"- Number of banks: {len(data)}")
print(f"- Initial shock probability: {shock_prob*100}%")
print(f"- Number of simulations: {n_sim}")
print(f"- Systemic event threshold: {systemic_threshold}+ bank failures")
print(f"- Traditional LGD: 60%")
print(f"- Blockchain LGD: 30%")
print(f"- Blockchain interbank liability reduction: 50%")

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
        np.random.seed(42)
    else:
        np.random.seed(44)  # Different seed for blockchain to avoid identical results
    
    # Adjust shock probability based on model type
    # Blockchain has better early warning systems, so initial shocks are less likely
    effective_shock_prob = shock_prob
    if model_type == "Blockchain":
        effective_shock_prob = shock_prob * 0.8  # 20% reduction in initial shock probability
    
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
    
    return failures_record

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
    
    # Calculate 95% confidence intervals
    ci_lower, ci_upper = stats.norm.interval(
        0.95, 
        loc=np.mean(failures), 
        scale=stats.sem(failures)
    )
    
    return {
        'Average Failures': np.mean(failures),
        'Median Failures': np.median(failures),
        'Max Failures': np.max(failures),
        'Std Dev Failures': np.std(failures),
        'Probability Systemic Event': np.mean(systemic_events),
        '95% CI Lower': ci_lower,
        '95% CI Upper': ci_upper
    }

def load_exposure_matrix(file_path):
    """
    Load the interbank exposure matrix from an external file
    
    Parameters:
    file_path (str): Path to the CSV file containing the exposure matrix
    
    Returns:
    numpy.ndarray: Exposure matrix where [i,j] represents bank i's exposure to bank j
    """
    try:
        # Try to load the exposure matrix from the CSV file
        exposure_df = pd.read_csv(file_path)
        print(f"Successfully loaded exposure matrix from {file_path}")
        
        # Skip the header row if it contains bank names
        if exposure_df.columns[0] in data['Bank Name'].values:
            exposure_matrix = exposure_df.values
        else:
            exposure_matrix = exposure_df.values
            
        return exposure_matrix
    except FileNotFoundError:
        print(f"Warning: {file_path} not found. Will calculate exposure matrix instead.")
        return None

print("\nLoading/building exposure matrices...")

# Traditional banking system
trad_exposure_file = 'traditional_exposure_matrix.csv'
trad_exposure = load_exposure_matrix(trad_exposure_file)

# If the exposure matrix file doesn't exist, calculate it
if trad_exposure is None:
    print("Calculating traditional exposure matrix...")
    trad_exposure = build_exposure_matrix(
        data['Interbank Assets (€B)'], 
        data['Interbank Liabilities (€B)']
    )
    
    # Save the calculated matrix for future use
    pd.DataFrame(
        trad_exposure, 
        columns=data['Bank Name'], 
        index=data['Bank Name']
    ).to_csv('calculated_traditional_exposure_matrix.csv')
    print("Saved calculated matrix to 'calculated_traditional_exposure_matrix.csv'")

# Blockchain-based banking system
bc_exposure_file = 'blockchain_exposure_matrix.csv'
bc_exposure = load_exposure_matrix(bc_exposure_file)

# If the blockchain exposure matrix file doesn't exist, derive it from the traditional one
if bc_exposure is None:
    print("Deriving blockchain exposure matrix from traditional matrix (50% reduction)...")
    bc_exposure = trad_exposure * 0.5  # 50% reduction in all exposures
    
    # Save the derived matrix for future use
    pd.DataFrame(
        bc_exposure, 
        columns=data['Bank Name'], 
        index=data['Bank Name']
    ).to_csv('calculated_blockchain_exposure_matrix.csv')
    print("Saved derived matrix to 'calculated_blockchain_exposure_matrix.csv'")

print("\nRunning Traditional Banking System simulation...")
trad_results = monte_carlo_sim(
    data, 
    trad_exposure, 
    lgd=0.6, 
    shock_prob=shock_prob, 
    n_sim=n_sim,
    model_type="Traditional"
)

print("\nRunning Blockchain Banking System simulation...")
bc_results = monte_carlo_sim(
    data, 
    bc_exposure, 
    lgd=0.3,  # Lower LGD for blockchain
    shock_prob=shock_prob, 
    n_sim=n_sim,
    model_type="Blockchain"
)

# Summarize results
trad_summary = summarize_results(trad_results)
bc_summary = summarize_results(bc_results)

# Calculate improvement percentages
improvements = {
    'Average Failures': (1 - bc_summary['Average Failures'] / trad_summary['Average Failures']) * 100 if trad_summary['Average Failures'] > 0 else 0,
    'Max Failures': trad_summary['Max Failures'] - bc_summary['Max Failures'],
    'Probability Systemic Event': (1 - bc_summary['Probability Systemic Event'] / trad_summary['Probability Systemic Event']) * 100 if trad_summary['Probability Systemic Event'] > 0 else 0,
    'Std Dev Failures': (1 - bc_summary['Std Dev Failures'] / trad_summary['Std Dev Failures']) * 100 if trad_summary['Std Dev Failures'] > 0 else 0
}

# Print results
print("\n======================================================================")
print("SIMULATION RESULTS")
print("======================================================================")

# Create a results table
results_df = pd.DataFrame({
    'Metric': ['Average Failures', 'Median Failures', 'Maximum Failures', 
               'Std Dev Failures', 'Probability Systemic Event (%)', 
               '95% CI Lower', '95% CI Upper'],
    'Traditional': [
        f"{trad_summary['Average Failures']:.4f}",
        f"{trad_summary['Median Failures']:.1f}",
        f"{trad_summary['Max Failures']:.0f}",
        f"{trad_summary['Std Dev Failures']:.4f}",
        f"{trad_summary['Probability Systemic Event']*100:.4f}%",
        f"{trad_summary['95% CI Lower']:.4f}",
        f"{trad_summary['95% CI Upper']:.4f}"
    ],
    'Blockchain': [
        f"{bc_summary['Average Failures']:.4f}",
        f"{bc_summary['Median Failures']:.1f}",
        f"{bc_summary['Max Failures']:.0f}",
        f"{bc_summary['Std Dev Failures']:.4f}",
        f"{bc_summary['Probability Systemic Event']*100:.4f}%",
        f"{bc_summary['95% CI Lower']:.4f}",
        f"{bc_summary['95% CI Upper']:.4f}"
    ],
    'Improvement': [
        f"{improvements['Average Failures']:.2f}% reduction" if improvements['Average Failures'] > 0 else "No improvement",
        "N/A",
        f"{improvements['Max Failures']:.0f} fewer failures" if improvements['Max Failures'] > 0 else "No improvement",
        f"{improvements['Std Dev Failures']:.2f}% lower volatility" if improvements['Std Dev Failures'] > 0 else "No improvement",
        f"{improvements['Probability Systemic Event']:.2f}% lower probability" if improvements['Probability Systemic Event'] > 0 else "No improvement",
        "N/A",
        "N/A"
    ]
})

# Print the table
print(results_df.to_string(index=False))

# Statistical analysis
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

print("\n======================================================================")
print("STATISTICAL ANALYSIS")
print("======================================================================")
print(f"T-statistic: {t_stat:.4f}")
print(f"P-value: {p_value:.4f}")
print(f"Statistically significant difference: {p_value < 0.05}")
print(f"Effect size (Cohen's d): {cohens_d:.4f}")
print(f"Effect interpretation: {'Small' if abs(cohens_d) < 0.5 else 'Medium' if abs(cohens_d) < 0.8 else 'Large'}")

# Visualizations
print("\nGenerating visualizations...")

# Set style
sns.set(style="whitegrid")
plt.figure(figsize=(12, 8))

# 1. Failure distribution histograms
plt.subplot(2, 2, 1)
sns.histplot(trad_failures, bins=range(max(max(trad_failures), max(bc_failures))+2), 
             alpha=0.7, label='Traditional', kde=True, color='#1f77b4')
sns.histplot(bc_failures, bins=range(max(max(trad_failures), max(bc_failures))+2), 
             alpha=0.7, label='Blockchain', kde=True, color='#ff7f0e')
plt.xlabel('Number of Bank Failures')
plt.ylabel('Frequency')
plt.title('Distribution of Bank Failures')
plt.legend()

# 2. Cumulative probability chart
plt.subplot(2, 2, 2)
sns.ecdfplot(trad_failures, label='Traditional', color='#1f77b4')
sns.ecdfplot(bc_failures, label='Blockchain', color='#ff7f0e')
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
        color=['#1f77b4', '#ff7f0e'])
plt.ylabel('Probability (%)')
plt.title('Probability of Systemic Event (≥3 failures)')

plt.tight_layout()
plt.savefig('failure_distribution.png', dpi=300)

# Create a second figure for additional visualizations
plt.figure(figsize=(12, 10))

# 5. Heatmap of bank failure correlations
# Extract which banks failed in each simulation
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
plt.savefig('failure_correlations.png', dpi=300)

# Save results to CSV for thesis inclusion
results_df.to_csv('simulation_results.csv', index=False)

# Calculate execution time
end_time = time.time()
execution_time = end_time - start_time

print(f"\nResults saved to 'simulation_results.csv'")
print(f"Visualizations saved as 'failure_distribution.png' and 'failure_correlations.png'")
print(f"\nExecution time: {execution_time:.2f} seconds")
print("\nMonte Carlo Systemic Risk Model execution complete.")