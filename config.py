"""
Configuration parameters for the Monte Carlo Systemic Risk Model
"""

# Simulation parameters
SHOCK_PROB = 0.03   # Initial shock probability (3%)
N_SIM = 10000       # Number of simulations
SYSTEMIC_THRESHOLD = 3  # Definition of systemic event: ≥3 bank failures

# Traditional banking parameters
TRAD_LGD = 0.6  # Loss Given Default for traditional banking (60%)

# Blockchain banking parameters
BC_LGD = 0.3  # Loss Given Default for blockchain banking (30%)
BC_LIABILITY_REDUCTION = 0.5  # Interbank liability reduction (50%)
BC_SHOCK_REDUCTION = 0.8  # Reduction in initial shock probability (20% reduction)
BC_CAPITAL_INCREASE = 1.1  # Increase in effective capital buffer (10% increase)
BC_CONTAGION_REDUCTION = 0.6  # Reduction in contagion effect (40% reduction)
TRAD_PANIC_FACTOR = 0.1  # Increase in losses per round due to market panic (10% per round)

# Random seeds for reproducibility
TRAD_SEED = 42
BC_SEED = 44

# Input file paths
BANK_DATA_FILE = 'banks_data.csv'
TRAD_EXPOSURE_FILE = 'traditional_exposure_matrix.csv'
BC_EXPOSURE_FILE = 'blockchain_exposure_matrix.csv'

# Output file names (without path)
CALC_TRAD_EXPOSURE_FILE = 'calculated_traditional_exposure_matrix.csv'
CALC_BC_EXPOSURE_FILE = 'calculated_blockchain_exposure_matrix.csv'
RESULTS_FILE = 'simulation_results.csv'
FAILURE_DIST_IMG = 'failure_distribution.png'
FAILURE_CORR_IMG = 'failure_correlations.png'

# Output directory will be set dynamically in main.py based on current timestamp

# Visualization settings
TRAD_COLOR = '#1f77b4'  # Blue
BC_COLOR = '#ff7f0e'    # Orange